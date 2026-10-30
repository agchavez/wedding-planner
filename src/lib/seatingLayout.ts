import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { isChairBlock, isTableType, type ElementType, type RoomPoint } from "@/lib/seatGeometry";
import { partySize } from "@/lib/guestSeating";
import { MAX_ROOM_COORD, MIN_ROOM_COORD } from "@/lib/layoutUnits";
import type { LayoutElement } from "@/generated/prisma";

export const VALID_ELEMENT_TYPES: ElementType[] = [
  "table-round",
  "table-rectangular",
  "table-sweetheart",
  "table-cake",
  "chair-row",
  "stage",
  "dance-floor",
  "photo-area",
  "altar",
  "aisle",
  "entrance",
  "restroom",
  "hallway",
];

const MIN_SIZE = 20;
const MAX_SIZE = 900;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function sanitizeElement(raw: LayoutElement): LayoutElement | null {
  if (!raw.id || !VALID_ELEMENT_TYPES.includes(raw.type as ElementType)) return null;

  const type = raw.type as ElementType;
  const isTable = isTableType(type);
  const isChairs = isChairBlock(type);

  return {
    id: raw.id,
    type,
    label: String(raw.label ?? "").slice(0, 60),
    tableNumber: isTable ? Number(raw.tableNumber ?? 0) : null,
    x: Number.isFinite(raw.x) ? raw.x : 0,
    y: Number.isFinite(raw.y) ? raw.y : 0,
    width: clamp(Number(raw.width) || MIN_SIZE, MIN_SIZE, MAX_SIZE),
    height: clamp(Number(raw.height) || MIN_SIZE, MIN_SIZE, MAX_SIZE),
    rotation: Number.isFinite(raw.rotation) ? raw.rotation : 0,
    capacity: isTable ? Math.max(1, Number(raw.capacity) || 1) : isChairs ? Number(raw.capacity) || 0 : null,
    rows: isChairs ? clamp(Number(raw.rows) || 1, 1, 20) : null,
    columns: isChairs ? clamp(Number(raw.columns) || 1, 1, 20) : null,
    fill: raw.fill ?? null,
    zIndex: Number.isFinite(raw.zIndex) ? raw.zIndex : 0,
  };
}

export function sanitizeRoomShape(points: RoomPoint[]): RoomPoint[] {
  if (!Array.isArray(points) || points.length < 3) return [];
  return points
    .filter((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y))
    .map((p) => ({ x: clamp(p.x, MIN_ROOM_COORD, MAX_ROOM_COORD), y: clamp(p.y, MIN_ROOM_COORD, MAX_ROOM_COORD) }));
}

// Vive en lib/layoutUnits.ts (puro, sin Prisma) para usarlo también en la biblioteca de salones.
export { clampCanvasSize } from "@/lib/layoutUnits";

/**
 * Una distribución por evento de la boda (WeddingEvent). El SeatingLayout comparte el
 * mismo id que su WeddingEvent — evita condiciones de carrera al inicializar (mismo
 * patrón de upsert-por-id-fijo que getActiveWeddingId en lib/wedding.ts) y hace explícita
 * la relación 1:1 entre evento y distribución.
 */
export async function getOrCreateSeatingLayout(eventId: string, weddingId?: string) {
  // Sin weddingId usa la boda activa de la sesión; el servidor MCP pasa la del token.
  weddingId ??= await getActiveWeddingId();
  // El evento debe pertenecer a la boda del usuario (evita leer/sobrescribir otra boda).
  await prisma.weddingEvent.findFirstOrThrow({ where: { id: eventId, weddingId }, select: { id: true } });
  return prisma.seatingLayout.upsert({
    where: { id: eventId },
    update: {},
    create: { id: eventId, weddingId, eventId, elements: [] },
  });
}

export type TableOption = {
  id: string;
  label: string;
  tableNumber: number | null;
  capacity: number;
  occupied: number;
  eventName: string;
};

export async function getTableOptionsWithOccupancy(): Promise<TableOption[]> {
  const weddingId = await getActiveWeddingId();
  const [layouts, events, guests] = await Promise.all([
    prisma.seatingLayout.findMany({ where: { weddingId } }),
    prisma.weddingEvent.findMany({ where: { weddingId } }),
    prisma.guest.findMany({ where: { weddingId }, select: { tableElementId: true, plusOnes: true } }),
  ]);

  const eventNameById = new Map(events.map((e) => [e.id, e.name]));

  // Personas sentadas por mesa (invitado + acompañantes), igual que el plano y el MCP.
  const occupancyByTable = new Map<string, number>();
  for (const guest of guests) {
    if (!guest.tableElementId) continue;
    occupancyByTable.set(guest.tableElementId, (occupancyByTable.get(guest.tableElementId) ?? 0) + partySize(guest));
  }

  const options: TableOption[] = [];
  for (const layout of layouts) {
    const elements = layout.elements as LayoutElement[];
    const eventName = (layout.eventId && eventNameById.get(layout.eventId)) || "Sin evento";
    for (const el of elements) {
      if (!isTableType(el.type as ElementType)) continue;
      options.push({
        id: el.id,
        label: el.label || "Mesa sin nombre",
        tableNumber: el.tableNumber ?? null,
        capacity: el.capacity ?? 0,
        occupied: occupancyByTable.get(el.id) ?? 0,
        eventName,
      });
    }
  }

  return options.sort((a, b) => (a.tableNumber ?? 0) - (b.tableNumber ?? 0));
}
