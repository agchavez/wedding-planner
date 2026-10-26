import "server-only";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { prisma } from "@/lib/prisma";
import { mongoDb } from "@/lib/mongo";
import { idMatch, idString } from "@/lib/ids";
import { parseWeddingRole, roleLabel } from "@/lib/permissions";
import { publicOrigin } from "@/lib/guestInvitations";
import { deleteDriveFile, getDriveConnection, uploadFileToDrive } from "@/lib/googleDrive";
import { SONG_CATEGORY_OPTIONS } from "@/app/(app)/canciones/categories";
import { TIMELINE_CATEGORY_OPTIONS } from "@/app/(app)/linea-tiempo/categories";
import { MEDIA_TYPE_OPTIONS } from "@/app/(app)/fotos/constants";
import { auth, editor, fileInput, httpUrl, json, log, objectId, reorder, toFile, wedding } from "@/lib/mcp/shared";
import type { MediaItem, Song, TimelineEvent } from "@/generated/prisma";

/**
 * Herramientas MCP de planificación: eventos de la boda y su línea de tiempo, música,
 * fotos y enlaces de referencia, participantes (solo lectura) y la actividad reciente.
 */

const songCategory = z.enum(SONG_CATEGORY_OPTIONS.map((o) => o.value) as [string, ...string[]]);
const timelineCategory = z.enum(["none", ...TIMELINE_CATEGORY_OPTIONS.map((o) => o.value)]);
const mediaType = z.enum(MEDIA_TYPE_OPTIONS.map((o) => o.value) as [string, ...string[]]);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:mm").or(z.literal(""));

/**
 * Igual que la línea de tiempo de la app: la hora "HH:mm" se combina con el día de la boda
 * (u hoy si todavía no hay fecha) en la hora local del servidor.
 */
function timeToDate(time: string | undefined, weddingDate: Date | null): Date | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const base = weddingDate ? new Date(weddingDate) : new Date();
  base.setHours(h, m, 0, 0);
  return base;
}

function dateToTime(date: Date | null) {
  if (!date) return null;
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function describeItem(t: TimelineEvent) {
  return {
    id: t.id,
    title: t.title,
    time: dateToTime(t.startTime),
    durationMinutes: t.durationMinutes,
    category: t.category || null,
    description: t.description || null,
  };
}

function describeSong(s: Song) {
  return {
    id: s.id,
    title: s.title,
    artist: s.artist || null,
    category: s.category,
    mustPlay: s.mustPlay,
    requestedBy: s.requestedBy || null,
    notes: s.notes || null,
  };
}

function describeMedia(m: MediaItem) {
  return { id: m.id, type: m.type, url: m.url, label: m.label || null, notes: m.notes || null, inGoogleDrive: Boolean(m.driveFileId) };
}

async function ownedEvent(weddingId: string, eventId: string) {
  return prisma.weddingEvent.findFirst({ where: { id: eventId, weddingId } });
}

export function registerPlanningTools(server: McpServer) {
  // ── Eventos y línea de tiempo ────────────────────────────────────────────────────────
  server.registerTool(
    "list_events",
    {
      title: "Eventos y línea de tiempo",
      description:
        "Eventos de la boda (ej. «Ceremonia», «Fiesta»; cada uno con su línea de tiempo y su salón) con sus actividades en orden y el enlace público de su agenda.",
      annotations: { readOnlyHint: true },
    },
    async (ctx) => {
      const a = auth(ctx);
      const [events, items, origin] = await Promise.all([
        prisma.weddingEvent.findMany({ where: { weddingId: a.weddingId }, orderBy: { sortOrder: "asc" } }),
        prisma.timelineEvent.findMany({ where: { weddingId: a.weddingId }, orderBy: { sortOrder: "asc" } }),
        publicOrigin(),
      ]);
      return json({
        timelineCategories: Object.fromEntries(TIMELINE_CATEGORY_OPTIONS.map((o) => [o.value, o.label])),
        events: events.map((e) => ({
          id: e.id,
          name: e.name,
          publicAgendaUrl: `${origin}/agenda/${e.id}`,
          printUrl: `${origin}/imprimir/linea-tiempo/${e.id}`,
          timeline: items.filter((t) => t.eventId === e.id).map(describeItem),
        })),
      });
    }
  );

  server.registerTool(
    "manage_event",
    {
      title: "Crear, renombrar, reordenar o eliminar un evento",
      description:
        "action=create (name), rename (eventId, name), delete (eventId) o reorder (eventIds en orden). Eliminar un evento borra su línea de tiempo y su distribución del salón: confirma antes con la persona.",
      inputSchema: z.object({
        action: z.enum(["create", "rename", "delete", "reorder"]),
        eventId: objectId.optional(),
        name: z.string().max(80).optional(),
        eventIds: z.array(objectId).max(50).optional(),
      }),
    },
    async ({ action, eventId, name, eventIds }, ctx) => {
      const a = editor(ctx);
      if (action === "create") {
        if (!name?.trim()) return json({ error: "Falta el nombre del evento." });
        const count = await prisma.weddingEvent.count({ where: { weddingId: a.weddingId } });
        const event = await prisma.weddingEvent.create({ data: { weddingId: a.weddingId, name: name.trim(), sortOrder: count } });
        await log(a, "event.create", `Creó el evento "${event.name}"`, event.id);
        return json({ created: { id: event.id, name: event.name } });
      }
      if (action === "reorder") {
        if (!eventIds?.length) return json({ error: "Falta eventIds." });
        await Promise.all(eventIds.map((id, i) => prisma.weddingEvent.updateMany({ where: { id, weddingId: a.weddingId }, data: { sortOrder: i } })));
        await log(a, "event.reorder", "Reordenó los eventos de la boda");
        return json({ ok: true });
      }
      const event = eventId ? await ownedEvent(a.weddingId, eventId) : null;
      if (!event) return json({ error: "Evento no encontrado." });
      if (action === "rename") {
        if (!name?.trim()) return json({ error: "Falta el nombre del evento." });
        await prisma.weddingEvent.update({ where: { id: event.id }, data: { name: name.trim() } });
        await log(a, "event.update", `Renombró el evento a "${name.trim()}"`, event.id);
        return json({ updated: { id: event.id, name: name.trim() } });
      }
      await prisma.timelineEvent.deleteMany({ where: { eventId: event.id, weddingId: a.weddingId } });
      // SeatingLayout comparte el mismo id que su WeddingEvent; sus mesas dejan de existir.
      const layout = await prisma.seatingLayout.findFirst({ where: { id: event.id, weddingId: a.weddingId } });
      if (layout) {
        await prisma.guest.updateMany({
          where: { weddingId: a.weddingId, tableElementId: { in: layout.elements.map((el) => el.id) } },
          data: { tableElementId: null },
        });
        await prisma.seatingLayout.delete({ where: { id: layout.id } });
      }
      await prisma.weddingEvent.delete({ where: { id: event.id } });
      await log(a, "event.delete", `Eliminó el evento "${event.name}" con su línea de tiempo y salón`, event.id);
      return json({ deleted: event.name });
    }
  );

  const itemFields = {
    title: z.string().min(1).max(120),
    time: hhmm.optional().describe("Hora de inicio HH:mm (24 h) el día de la boda"),
    durationMinutes: z.number().int().min(0).max(24 * 60).optional(),
    category: timelineCategory.optional(),
    description: z.string().max(1000).optional(),
  };

  server.registerTool(
    "add_timeline_items",
    {
      title: "Agregar actividades a la línea de tiempo",
      description: "Agrega una o varias actividades al final de la línea de tiempo de un evento.",
      inputSchema: z.object({ eventId: objectId, items: z.array(z.object(itemFields)).min(1).max(100) }),
    },
    async ({ eventId, items }, ctx) => {
      const a = editor(ctx);
      const event = await ownedEvent(a.weddingId, eventId);
      if (!event) return json({ error: "Evento no encontrado." });
      const w = await wedding(a);
      let count = await prisma.timelineEvent.count({ where: { eventId, weddingId: a.weddingId } });
      const created: TimelineEvent[] = [];
      for (const item of items) {
        created.push(
          await prisma.timelineEvent.create({
            data: {
              weddingId: a.weddingId,
              eventId,
              title: item.title.trim(),
              description: item.description ?? "",
              startTime: timeToDate(item.time, w.weddingDate),
              durationMinutes: item.durationMinutes ?? 0,
              category: item.category && item.category !== "none" ? item.category : null,
              sortOrder: count++ * 1000,
            },
          })
        );
      }
      await log(a, "timeline.create", `Agregó ${created.length} actividades a la línea de tiempo de "${event.name}"`, eventId);
      return json({ created: created.map(describeItem) });
    }
  );

  server.registerTool(
    "update_timeline_item",
    {
      title: "Editar actividad de la línea de tiempo",
      description: "Cambia una actividad. time=\"\" la deja sin hora; category=\"none\" sin categoría.",
      inputSchema: z.object({ itemId: objectId, ...z.object(itemFields).partial().shape }),
    },
    async ({ itemId, time, category, title, ...rest }, ctx) => {
      const a = editor(ctx);
      const item = await prisma.timelineEvent.findFirst({ where: { id: itemId, weddingId: a.weddingId } });
      if (!item) return json({ error: "Actividad no encontrada." });
      const w = time !== undefined ? await wedding(a) : null;
      const updated = await prisma.timelineEvent.update({
        where: { id: item.id },
        data: {
          ...rest,
          ...(title !== undefined ? { title: title.trim() } : {}),
          ...(time !== undefined ? { startTime: timeToDate(time, w!.weddingDate) } : {}),
          ...(category !== undefined ? { category: category === "none" ? null : category } : {}),
        },
      });
      await log(a, "timeline.update", `Editó "${updated.title}" en la línea de tiempo`, updated.id);
      return json({ updated: describeItem(updated) });
    }
  );

  server.registerTool(
    "delete_timeline_items",
    {
      title: "Eliminar actividades",
      description: "Elimina actividades de la línea de tiempo por id.",
      inputSchema: z.object({ itemIds: z.array(objectId).min(1).max(200) }),
      annotations: { destructiveHint: true },
    },
    async ({ itemIds }, ctx) => {
      const a = editor(ctx);
      const result = await prisma.timelineEvent.deleteMany({ where: { weddingId: a.weddingId, id: { in: itemIds } } });
      await log(a, "timeline.delete", `Eliminó ${result.count} actividades de la línea de tiempo`);
      return json({ deleted: result.count });
    }
  );

  server.registerTool(
    "reorder_timeline",
    {
      title: "Reordenar la línea de tiempo",
      description: "Define el orden de las actividades de un evento (lista de ids en el orden deseado).",
      inputSchema: z.object({ itemIds: z.array(objectId).min(1).max(300) }),
    },
    async ({ itemIds }, ctx) => {
      const a = editor(ctx);
      await reorder(itemIds, (id, sortOrder) => prisma.timelineEvent.updateMany({ where: { id, weddingId: a.weddingId }, data: { sortOrder } }));
      await log(a, "timeline.reorder", "Reordenó la línea de tiempo");
      return json({ ok: true });
    }
  );

  // ── Música ────────────────────────────────────────────────────────────────────────────
  server.registerTool(
    "list_songs",
    {
      title: "Listar canciones",
      description: "Lista de música de la boda por momento (ceremonia, entrada, cena, fiesta, no tocar…), en orden.",
      inputSchema: z.object({ category: songCategory.optional(), mustPlayOnly: z.boolean().optional() }),
      annotations: { readOnlyHint: true },
    },
    async ({ category, mustPlayOnly }, ctx) => {
      const a = auth(ctx);
      const songs = await prisma.song.findMany({
        where: { weddingId: a.weddingId, ...(category ? { category } : {}), ...(mustPlayOnly ? { mustPlay: true } : {}) },
        orderBy: { sortOrder: "asc" },
      });
      return json({
        categories: Object.fromEntries(SONG_CATEGORY_OPTIONS.map((o) => [o.value, o.label])),
        count: songs.length,
        songs: songs.map(describeSong),
      });
    }
  );

  const songFields = {
    title: z.string().min(1).max(200),
    artist: z.string().max(200).optional(),
    category: songCategory.optional(),
    mustPlay: z.boolean().optional(),
    requestedBy: z.string().max(120).optional(),
    notes: z.string().max(500).optional(),
  };

  server.registerTool(
    "add_songs",
    {
      title: "Agregar canciones",
      description: "Agrega una o varias canciones a la lista (hasta 200).",
      inputSchema: z.object({ songs: z.array(z.object(songFields)).min(1).max(200) }),
    },
    async ({ songs }, ctx) => {
      const a = editor(ctx);
      const counts = new Map<string, number>();
      const created: Song[] = [];
      for (const s of songs) {
        const category = s.category ?? "other";
        if (!counts.has(category)) counts.set(category, await prisma.song.count({ where: { weddingId: a.weddingId, category } }));
        const n = counts.get(category)!;
        counts.set(category, n + 1);
        created.push(
          await prisma.song.create({
            data: {
              weddingId: a.weddingId,
              title: s.title.trim(),
              artist: s.artist ?? "",
              category,
              mustPlay: s.mustPlay ?? false,
              requestedBy: s.requestedBy ?? "",
              notes: s.notes ?? "",
              sortOrder: n * 1000,
            },
          })
        );
      }
      await log(a, "song.create", created.length === 1 ? `Agregó la canción "${created[0].title}"` : `Agregó ${created.length} canciones`);
      return json({ created: created.map(describeSong) });
    }
  );

  server.registerTool(
    "update_song",
    {
      title: "Editar canción",
      description: "Cambia los datos de una canción.",
      inputSchema: z.object({ songId: objectId, ...z.object(songFields).partial().shape }),
    },
    async ({ songId, title, ...rest }, ctx) => {
      const a = editor(ctx);
      const song = await prisma.song.findFirst({ where: { id: songId, weddingId: a.weddingId } });
      if (!song) return json({ error: "Canción no encontrada." });
      const updated = await prisma.song.update({ where: { id: song.id }, data: { ...rest, ...(title !== undefined ? { title: title.trim() } : {}) } });
      await log(a, "song.update", `Editó la canción "${updated.title}"`, updated.id);
      return json({ updated: describeSong(updated) });
    }
  );

  server.registerTool(
    "delete_songs",
    {
      title: "Eliminar canciones",
      description: "Elimina canciones por id.",
      inputSchema: z.object({ songIds: z.array(objectId).min(1).max(500) }),
      annotations: { destructiveHint: true },
    },
    async ({ songIds }, ctx) => {
      const a = editor(ctx);
      const result = await prisma.song.deleteMany({ where: { weddingId: a.weddingId, id: { in: songIds } } });
      await log(a, "song.delete", `Eliminó ${result.count} canciones`);
      return json({ deleted: result.count });
    }
  );

  server.registerTool(
    "reorder_songs",
    {
      title: "Reordenar canciones",
      description: "Define el orden de las canciones (lista de ids en el orden deseado, normalmente de un mismo momento).",
      inputSchema: z.object({ songIds: z.array(objectId).min(1).max(500) }),
    },
    async ({ songIds }, ctx) => {
      const a = editor(ctx);
      await reorder(songIds, (id, sortOrder) => prisma.song.updateMany({ where: { id, weddingId: a.weddingId }, data: { sortOrder } }));
      await log(a, "song.reorder", "Reordenó la lista de canciones");
      return json({ ok: true });
    }
  );

  // ── Fotos y enlaces ──────────────────────────────────────────────────────────────────
  server.registerTool(
    "list_media",
    {
      title: "Fotos, videos y enlaces",
      description: "Fotos, videos, mapas y enlaces de referencia de la boda, si Google Drive está conectado y el enlace público de la galería.",
      inputSchema: z.object({ type: mediaType.optional() }),
      annotations: { readOnlyHint: true },
    },
    async ({ type }, ctx) => {
      const a = auth(ctx);
      const [items, drive, origin] = await Promise.all([
        prisma.mediaItem.findMany({ where: { weddingId: a.weddingId, ...(type ? { type } : {}) }, orderBy: { sortOrder: "asc" } }),
        getDriveConnection(a.weddingId),
        publicOrigin(),
      ]);
      return json({
        googleDrive: drive ? { connected: true, account: drive.accountEmail || null } : { connected: false },
        publicGalleryUrl: `${origin}/galeria/${a.weddingId}`,
        items: items.map(describeMedia),
      });
    }
  );

  server.registerTool(
    "add_media",
    {
      title: "Agregar foto, video o enlace",
      description:
        "Agrega un enlace (url + type: image, video, map o link) o sube un archivo (file, en base64) a la carpeta de Google Drive conectada. Para subir archivos, Google Drive debe estar conectado desde la app (Fotos).",
      inputSchema: z.object({
        type: mediaType.optional(),
        url: httpUrl.optional(),
        file: fileInput.optional(),
        label: z.string().max(120).optional(),
        notes: z.string().max(1000).optional(),
      }),
    },
    async ({ type, url, file, label, notes }, ctx) => {
      const a = editor(ctx);
      let finalUrl = url ?? "";
      let finalType = type ?? "link";
      let driveFileId: string | null = null;
      if (file) {
        const uploaded = await uploadFileToDrive(toFile(file), a.weddingId);
        if (!uploaded) return json({ error: "Google Drive no está conectado. Conéctalo en Fotos desde la app para subir archivos." });
        finalUrl = uploaded.url;
        driveFileId = uploaded.driveFileId;
        finalType = file.mimeType.startsWith("video/") ? "video" : "image";
      }
      if (!finalUrl) return json({ error: "Pasa url o file." });
      const count = await prisma.mediaItem.count({ where: { weddingId: a.weddingId } });
      const item = await prisma.mediaItem.create({
        data: { weddingId: a.weddingId, type: finalType, url: finalUrl, driveFileId, label: label?.trim() ?? "", notes: notes?.trim() ?? "", sortOrder: count },
      });
      await log(a, "media.create", `Agregó "${item.label || item.url}" a Fotos`, item.id);
      return json({ created: describeMedia(item) });
    }
  );

  server.registerTool(
    "update_media",
    {
      title: "Editar foto o enlace",
      description: "Cambia el título o las notas de un elemento de Fotos.",
      inputSchema: z.object({ mediaId: objectId, label: z.string().max(120).optional(), notes: z.string().max(1000).optional() }),
    },
    async ({ mediaId, label, notes }, ctx) => {
      const a = editor(ctx);
      const item = await prisma.mediaItem.findFirst({ where: { id: mediaId, weddingId: a.weddingId } });
      if (!item) return json({ error: "Elemento no encontrado." });
      const updated = await prisma.mediaItem.update({
        where: { id: item.id },
        data: { ...(label !== undefined ? { label: label.trim() } : {}), ...(notes !== undefined ? { notes: notes.trim() } : {}) },
      });
      await log(a, "media.update", `Editó "${updated.label || updated.url}" en Fotos`, updated.id);
      return json({ updated: describeMedia(updated) });
    }
  );

  server.registerTool(
    "delete_media",
    {
      title: "Eliminar foto o enlace",
      description: "Elimina un elemento de Fotos; si se subió a Google Drive, también borra el archivo de Drive.",
      inputSchema: z.object({ mediaId: objectId }),
      annotations: { destructiveHint: true },
    },
    async ({ mediaId }, ctx) => {
      const a = editor(ctx);
      const item = await prisma.mediaItem.findFirst({ where: { id: mediaId, weddingId: a.weddingId } });
      if (!item) return json({ error: "Elemento no encontrado." });
      if (item.driveFileId) await deleteDriveFile(item.driveFileId, a.weddingId);
      await prisma.mediaItem.delete({ where: { id: item.id } });
      await log(a, "media.delete", `Eliminó "${item.label || item.url}" de Fotos`, item.id);
      return json({ deleted: item.label || item.url });
    }
  );

  server.registerTool(
    "reorder_media",
    {
      title: "Reordenar fotos",
      description: "Define el orden de los elementos de Fotos y de la galería pública (lista de ids en orden).",
      inputSchema: z.object({ mediaIds: z.array(objectId).min(1).max(500) }),
    },
    async ({ mediaIds }, ctx) => {
      const a = editor(ctx);
      await Promise.all(mediaIds.map((id, i) => prisma.mediaItem.updateMany({ where: { id, weddingId: a.weddingId }, data: { sortOrder: i } })));
      await log(a, "media.reorder", "Reordenó las fotos");
      return json({ ok: true });
    }
  );

  // ── Participantes y actividad ────────────────────────────────────────────────────────
  server.registerTool(
    "list_participants",
    {
      title: "Participantes de la boda",
      description:
        "Quiénes organizan la boda en la app (pareja, organizadores, colaboradores, solo lectura) y las invitaciones pendientes. Invitar, cambiar roles o quitar participantes se hace desde la app (Participantes).",
      annotations: { readOnlyHint: true },
    },
    async (ctx) => {
      const a = auth(ctx);
      const members = await mongoDb.collection("member").find({ organizationId: idMatch(a.weddingId) }).toArray();
      const users = await mongoDb
        .collection("user")
        .find({ _id: { $in: members.map((m) => m.userId) } })
        .project({ name: 1, email: 1 })
        .toArray();
      const invitations = await mongoDb
        .collection("invitation")
        .find({ organizationId: idMatch(a.weddingId), status: "pending", expiresAt: { $gt: new Date() } })
        .toArray();
      const origin = await publicOrigin();
      return json({
        participants: members.map((m) => {
          const u = users.find((x) => idString(x._id) === idString(m.userId));
          return { name: u?.name ?? null, email: u?.email ?? null, role: parseWeddingRole(m.role), roleLabel: roleLabel(m.role), joinedAt: m.createdAt };
        }),
        pendingInvitations: invitations.map((i) => ({
          email: i.email,
          role: roleLabel(i.role),
          expiresAt: i.expiresAt,
          link: `${origin}/invitacion/${idString(i._id)}`,
        })),
      });
    }
  );

  server.registerTool(
    "recent_activity",
    {
      title: "Actividad reciente",
      description: "Registro de cambios hechos en la boda (quién hizo qué y cuándo), del más reciente al más antiguo.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(200).optional(),
        action: z.string().optional().describe("Prefijo de acción, ej. «guest», «expense», «invitation»"),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ limit = 50, action }, ctx) => {
      const a = auth(ctx);
      const entries = await prisma.auditLog.findMany({
        where: { weddingId: a.weddingId, category: "data", ...(action ? { action: { startsWith: action } } : {}) },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return json(entries.map((e) => ({ at: e.createdAt.toISOString(), who: e.actorName || null, action: e.action, summary: e.summary })));
    }
  );
}
