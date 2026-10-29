import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { prisma } from "@/lib/prisma";
import { clampCanvasSize, getOrCreateSeatingLayout, sanitizeElement, sanitizeRoomShape, VALID_ELEMENT_TYPES } from "@/lib/seatingLayout";
import {
  ELEMENT_LABELS,
  getDefaultElementShape,
  getElementFootprint,
  getRoomShapePreset,
  isTableType,
  MAX_LAYOUT_ELEMENTS,
  ROOM_SHAPE_PRESETS,
  type ElementType,
} from "@/lib/seatGeometry";
import { boxFromPoints, findFreeSpot, shapeBox, type Box } from "@/lib/layoutGeometry";
import { auth, editor, json, log, objectId } from "@/lib/mcp/shared";
import { pxToMeters, resolvePxPerMeter, roundMeters } from "@/lib/layoutUnits";
import type { Guest, LayoutElement } from "@/generated/prisma";

/**
 * Herramientas MCP de la distribución del salón (una por evento): mesas, zonas y bloques de
 * sillas, y la asignación de invitados a mesas. Coordenadas en el lienzo (0,0 arriba a la
 * izquierda; por defecto 2000×1400); x/y son el centro del elemento. La escala real va en
 * canvas.pxPerMeter (por defecto ≈66.67 px/m: la mesa redonda de 100 px mide 1.5 m).
 */

const elementType = z.enum(VALID_ELEMENT_TYPES as [ElementType, ...ElementType[]]);

const elementFields = {
  label: z.string().max(60).optional(),
  tableNumber: z.number().int().min(0).max(999).optional(),
  x: z.number().min(-2000).max(6000).optional(),
  y: z.number().min(-2000).max(6000).optional(),
  width: z.number().min(20).max(900).optional(),
  height: z.number().min(20).max(900).optional(),
  rotation: z.number().min(-360).max(360).optional(),
  capacity: z.number().int().min(1).max(100).optional().describe("Asientos (mesas)"),
  rows: z.number().int().min(1).max(20).optional().describe("Solo chair-row"),
  columns: z.number().int().min(1).max(20).optional().describe("Solo chair-row"),
};

/**
 * Ids de las mesas de todos los salones de la boda. Un invitado cuya mesa ya no existe (se
 * borró en el editor) cuenta como sin mesa, igual que en el plano y en /invitados.
 */
function weddingTableIds(layouts: { elements: LayoutElement[] }[]) {
  return new Set(layouts.flatMap((l) => l.elements).filter((el) => isTableType(el.type)).map((el) => el.id));
}

function describeElement(el: LayoutElement, guests: Guest[]) {
  const seated = isTableType(el.type) ? guests.filter((g) => g.tableElementId === el.id) : [];
  return {
    id: el.id,
    type: el.type,
    label: el.label,
    ...(isTableType(el.type)
      ? {
          tableNumber: el.tableNumber,
          capacity: el.capacity,
          // Cada invitado ocupa 1 + sus acompañantes.
          seatsTaken: seated.reduce((n, g) => n + 1 + g.plusOnes, 0),
          // seatIndex: primera silla del grupo (null = el plano lo acomoda en la primera libre).
          guests: seated.map((g) => ({ id: g.id, fullName: g.fullName, seats: 1 + g.plusOnes, seatIndex: g.seatIndex ?? null })),
        }
      : {}),
    ...(el.type === "chair-row" ? { rows: el.rows, columns: el.columns } : {}),
    x: Math.round(el.x),
    y: Math.round(el.y),
    width: el.width,
    height: el.height,
    rotation: el.rotation,
  };
}

async function layoutFor(weddingId: string, eventId: string) {
  const event = await prisma.weddingEvent.findFirst({ where: { id: eventId, weddingId } });
  if (!event) return null;
  return { event, layout: await getOrCreateSeatingLayout(eventId, weddingId) };
}

/** Zona donde se pueden colocar elementos sin x/y: el contorno del local (si hay) o el lienzo. */
function placementBounds(layout: { canvasWidth: number; canvasHeight: number; roomShape: { x: number; y: number }[] }): Box {
  if (layout.roomShape.length >= 3) {
    return layout.roomShape.reduce((box, p) => ({
      minX: Math.min(box.minX, p.x),
      minY: Math.min(box.minY, p.y),
      maxX: Math.max(box.maxX, p.x),
      maxY: Math.max(box.maxY, p.y),
    }), boxFromPoints(layout.roomShape[0], layout.roomShape[0]));
  }
  return { minX: 0, minY: 0, maxX: layout.canvasWidth, maxY: layout.canvasHeight };
}

async function saveElements(layoutId: string, elements: LayoutElement[]) {
  // Mismo máximo que el editor (saveLayout): evita rebasar el tamaño del documento.
  const sanitized = elements
    .map(sanitizeElement)
    .filter((el): el is LayoutElement => el !== null)
    .slice(0, MAX_LAYOUT_ELEMENTS);
  await prisma.seatingLayout.update({ where: { id: layoutId }, data: { elements: sanitized } });
  return sanitized;
}

export function registerSeatingTools(server: McpServer) {
  server.registerTool(
    "get_seating",
    {
      title: "Ver distribución del salón",
      description:
        "Distribución de un evento: tamaño y estilo del salón, mesas (con capacidad, asientos ocupados e invitados sentados), zonas y bloques de sillas, más los invitados sin mesa. Sin eventId devuelve un resumen de todos los eventos.",
      inputSchema: z.object({ eventId: objectId.optional() }),
      annotations: { readOnlyHint: true },
    },
    async ({ eventId }, ctx) => {
      const a = auth(ctx);
      const guests = await prisma.guest.findMany({ where: { weddingId: a.weddingId }, orderBy: { fullName: "asc" } });
      if (!eventId) {
        const [events, layouts] = await Promise.all([
          prisma.weddingEvent.findMany({ where: { weddingId: a.weddingId }, orderBy: { sortOrder: "asc" } }),
          prisma.seatingLayout.findMany({ where: { weddingId: a.weddingId } }),
        ]);
        const tableIds = weddingTableIds(layouts);
        return json({
          elementTypes: ELEMENT_LABELS,
          events: events.map((e) => {
            const tables = (layouts.find((l) => l.id === e.id)?.elements ?? []).filter((el) => isTableType(el.type));
            return {
              eventId: e.id,
              name: e.name,
              tables: tables.length,
              capacity: tables.reduce((n, t) => n + (t.capacity ?? 0), 0),
              seatsTaken: guests.filter((g) => tables.some((t) => t.id === g.tableElementId)).reduce((n, g) => n + 1 + g.plusOnes, 0),
            };
          }),
          guestsWithoutTable: guests.filter((g) => !g.tableElementId || !tableIds.has(g.tableElementId)).length,
        });
      }
      const found = await layoutFor(a.weddingId, eventId);
      if (!found) return json({ error: "Evento no encontrado." });
      const { layout, event } = found;
      const pxPerMeter = resolvePxPerMeter(layout.pxPerMeter);
      const tableIds = weddingTableIds(await prisma.seatingLayout.findMany({ where: { weddingId: a.weddingId }, select: { elements: true } }));
      return json({
        event: event.name,
        canvas: {
          width: layout.canvasWidth,
          height: layout.canvasHeight,
          background: layout.background,
          roomShape: layout.roomShape,
          // Campos agregados con la escala en metros y la capa salón (solo lectura por ahora).
          pxPerMeter,
          sizeMeters: {
            width: roundMeters(pxToMeters(layout.canvasWidth, pxPerMeter)),
            height: roundMeters(pxToMeters(layout.canvasHeight, pxPerMeter)),
          },
          roomFixtures: layout.roomFixtures ?? [],
        },
        elements: layout.elements.map((el) => describeElement(el, guests)),
        guestsWithoutTable: guests
          .filter((g) => (!g.tableElementId || !tableIds.has(g.tableElementId)) && g.rsvpStatus !== "declined")
          .map((g) => ({ id: g.id, fullName: g.fullName, seats: 1 + g.plusOnes, group: g.group || null, side: g.side || null })),
      });
    }
  );

  server.registerTool(
    "add_layout_elements",
    {
      title: "Agregar mesas o zonas al salón",
      description:
        "Agrega elementos a la distribución de un evento. Tipos: table-round, table-rectangular, table-sweetheart (novios), table-cake, chair-row (bloque de sillas de ceremonia), stage, dance-floor, photo-area, altar, aisle, entrance, restroom, hallway. Sin tamaño o capacidad usa los de la app (mesa redonda: 1.5 m = 100×100 px con la escala por defecto, 8 personas). Las mesas sin número se numeran después de la última.",
      inputSchema: z.object({
        eventId: objectId,
        elements: z.array(z.object({ type: elementType, ...elementFields })).min(1).max(100),
      }),
    },
    async ({ eventId, elements }, ctx) => {
      const a = editor(ctx);
      const found = await layoutFor(a.weddingId, eventId);
      if (!found) return json({ error: "Evento no encontrado." });
      const { layout } = found;
      if (layout.elements.length + elements.length > MAX_LAYOUT_ELEMENTS) {
        return json({
          error: `La distribución admite hasta ${MAX_LAYOUT_ELEMENTS} elementos (hay ${layout.elements.length}).`,
        });
      }
      const pxPerMeter = resolvePxPerMeter(layout.pxPerMeter);
      let nextNumber = Math.max(0, ...layout.elements.map((el) => el.tableNumber ?? 0));
      // Sin x/y, cada elemento va al centro del lienzo o al hueco libre más cercano (no apilados),
      // sin encimarse con paredes/columnas y sin salirse del local (o del lienzo).
      const occupied = [
        ...layout.elements.map((el) =>
          shapeBox({ id: el.id, x: el.x, y: el.y, rotation: el.rotation, ...getElementFootprint(el, pxPerMeter) })
        ),
        ...(layout.roomFixtures ?? []).map((f) =>
          shapeBox({ id: f.id, x: f.x, y: f.y, width: f.width, height: f.height, rotation: f.rotation, round: f.type === "column-round" })
        ),
      ];
      const bounds = placementBounds(layout);
      const added: LayoutElement[] = elements.map((input, i) => {
        const shape = getDefaultElementShape(input.type, pxPerMeter);
        const isTable = isTableType(input.type);
        const tableNumber = isTable ? (input.tableNumber ?? ++nextNumber) : null;
        if (isTable && input.tableNumber) nextNumber = Math.max(nextNumber, input.tableNumber);
        const width = input.width ?? shape.width;
        const height = input.height ?? shape.height;
        const footprint = getElementFootprint({ type: input.type, width, height, capacity: input.capacity ?? shape.capacity }, pxPerMeter);
        const center = { x: input.x ?? (bounds.minX + bounds.maxX) / 2, y: input.y ?? (bounds.minY + bounds.maxY) / 2 };
        const spot =
          input.x === undefined && input.y === undefined
            ? findFreeSpot(center, footprint.width, footprint.height, occupied, pxPerMeter * 0.3, bounds)
            : center;
        occupied.push(shapeBox({ id: "", x: spot.x, y: spot.y, rotation: input.rotation ?? 0, ...footprint }));
        return {
          id: randomUUID(),
          type: input.type,
          label: input.label ?? (isTable ? `Mesa ${tableNumber}` : ELEMENT_LABELS[input.type]),
          tableNumber,
          x: spot.x,
          y: spot.y,
          width,
          height,
          rotation: input.rotation ?? 0,
          capacity: input.capacity ?? shape.capacity,
          rows: input.rows ?? shape.rows,
          columns: input.columns ?? shape.columns,
          fill: null,
          zIndex: layout.elements.length + i,
        };
      });
      const saved = await saveElements(layout.id, [...layout.elements, ...added]);
      await log(a, "layout.save", `Agregó ${added.length} elementos a la distribución del salón`, eventId);
      return json({ added: saved.filter((el) => added.some((x) => x.id === el.id)).map((el) => describeElement(el, [])) });
    }
  );

  server.registerTool(
    "update_layout_element",
    {
      title: "Editar mesa o zona",
      description: "Mueve, redimensiona, rota o cambia nombre, número o capacidad de un elemento del salón.",
      inputSchema: z.object({ eventId: objectId, elementId: z.string(), ...elementFields }),
    },
    async ({ eventId, elementId, ...patch }, ctx) => {
      const a = editor(ctx);
      const found = await layoutFor(a.weddingId, eventId);
      if (!found) return json({ error: "Evento no encontrado." });
      const { layout } = found;
      if (!layout.elements.some((el) => el.id === elementId)) return json({ error: "Elemento no encontrado en este salón." });
      const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
      const saved = await saveElements(
        layout.id,
        layout.elements.map((el) => (el.id === elementId ? { ...el, ...defined } : el))
      );
      await log(a, "layout.save", "Editó un elemento de la distribución del salón", eventId);
      const guests = await prisma.guest.findMany({ where: { weddingId: a.weddingId, tableElementId: elementId } });
      return json({ updated: describeElement(saved.find((el) => el.id === elementId)!, guests) });
    }
  );

  server.registerTool(
    "delete_layout_elements",
    {
      title: "Quitar mesas o zonas",
      description: "Quita elementos del salón. Los invitados sentados en una mesa eliminada quedan sin mesa.",
      inputSchema: z.object({ eventId: objectId, elementIds: z.array(z.string()).min(1).max(200) }),
      annotations: { destructiveHint: true },
    },
    async ({ eventId, elementIds }, ctx) => {
      const a = editor(ctx);
      const found = await layoutFor(a.weddingId, eventId);
      if (!found) return json({ error: "Evento no encontrado." });
      const { layout } = found;
      const remove = new Set(elementIds);
      await saveElements(layout.id, layout.elements.filter((el) => !remove.has(el.id)));
      const unseated = await prisma.guest.updateMany({
        where: { weddingId: a.weddingId, tableElementId: { in: elementIds } },
        data: { tableElementId: null, seatIndex: null },
      });
      await log(a, "layout.save", `Quitó ${remove.size} elementos de la distribución del salón`, eventId);
      return json({ removed: layout.elements.filter((el) => remove.has(el.id)).length, guestsUnseated: unseated.count });
    }
  );

  server.registerTool(
    "update_room",
    {
      title: "Configurar el salón",
      description: `Tamaño del lienzo (800–4000), estilo (indoor = salón, garden = jardín) y forma del local: un preset (${ROOM_SHAPE_PRESETS.map((p) => p.value).join(", ")}), "none" para quitarla, o roomShape con los vértices del polígono.`,
      inputSchema: z.object({
        eventId: objectId,
        canvasWidth: z.number().int().optional(),
        canvasHeight: z.number().int().optional(),
        background: z.enum(["indoor", "garden"]).optional(),
        shapePreset: z.enum(["none", ...ROOM_SHAPE_PRESETS.map((p) => p.value)]).optional(),
        roomShape: z.array(z.object({ x: z.number(), y: z.number() })).min(3).max(100).optional(),
      }),
    },
    async ({ eventId, canvasWidth, canvasHeight, background, shapePreset, roomShape }, ctx) => {
      const a = editor(ctx);
      const found = await layoutFor(a.weddingId, eventId);
      if (!found) return json({ error: "Evento no encontrado." });
      const { layout } = found;
      const width = canvasWidth !== undefined ? clampCanvasSize(canvasWidth) : layout.canvasWidth;
      const height = canvasHeight !== undefined ? clampCanvasSize(canvasHeight) : layout.canvasHeight;
      const shape =
        shapePreset === "none"
          ? []
          : shapePreset
            ? getRoomShapePreset(shapePreset as (typeof ROOM_SHAPE_PRESETS)[number]["value"], width, height)
            : roomShape
              ? sanitizeRoomShape(roomShape)
              : undefined;
      const updated = await prisma.seatingLayout.update({
        where: { id: layout.id },
        data: {
          canvasWidth: width,
          canvasHeight: height,
          ...(background ? { background } : {}),
          ...(shape !== undefined ? { roomShape: shape } : {}),
        },
      });
      await log(a, "layout.save", "Editó la configuración del salón", eventId);
      return json({ canvas: { width: updated.canvasWidth, height: updated.canvasHeight, background: updated.background, roomShape: updated.roomShape } });
    }
  );

  server.registerTool(
    "assign_guests_to_table",
    {
      title: "Sentar invitados en una mesa",
      description:
        "Asigna invitados a una mesa (tableElementId de get_seating) o los deja sin mesa (tableElementId=null). Avisa si la mesa queda por encima de su capacidad.",
      inputSchema: z.object({ guestIds: z.array(objectId).min(1).max(200), tableElementId: z.string().nullable() }),
    },
    async ({ guestIds, tableElementId }, ctx) => {
      const a = editor(ctx);
      let table: LayoutElement | undefined;
      if (tableElementId) {
        const layouts = await prisma.seatingLayout.findMany({ where: { weddingId: a.weddingId } });
        table = layouts.flatMap((l) => l.elements).find((el) => el.id === tableElementId && isTableType(el.type));
        if (!table) return json({ error: "Mesa no encontrada." });
      }
      const current = await prisma.guest.findMany({
        where: { weddingId: a.weddingId, id: { in: guestIds } },
        select: { id: true, tableElementId: true },
      });
      // Solo cambian los que van a otra mesa; su silla anterior ya no aplica (el plano los sienta
      // en la primera libre). Los que ya estaban en esa mesa conservan su silla.
      const changing = current.filter((g) => g.tableElementId !== tableElementId).map((g) => g.id);
      if (changing.length > 0) {
        await prisma.guest.updateMany({
          where: { weddingId: a.weddingId, id: { in: changing } },
          data: { tableElementId, seatIndex: null },
        });
      }
      const result = { count: current.length };
      await log(a, "guest.assign_table", table ? `Asignó ${result.count} invitados a "${table.label}"` : `Quitó la mesa de ${result.count} invitados`);
      if (!table) return json({ updated: result.count });
      const seated = await prisma.guest.findMany({ where: { weddingId: a.weddingId, tableElementId } });
      const seatsTaken = seated.reduce((n, g) => n + 1 + g.plusOnes, 0);
      return json({
        updated: result.count,
        table: table.label,
        capacity: table.capacity,
        seatsTaken,
        ...(table.capacity && seatsTaken > table.capacity ? { warning: `La mesa supera su capacidad (${seatsTaken}/${table.capacity}).` } : {}),
      });
    }
  );
}
