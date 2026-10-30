import "server-only";
import { Prisma, type PlanImage, type RoomFixture, type VenueRoomVersion } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  layerSizeMeters,
  parseVisibility,
  planUploadWeddingId,
  sanitizePlanImage,
  type BaseRoomInfo,
  type LibraryRoom,
  type RoomLayer,
  type RoomVersionData,
} from "@/lib/venueLibrary";
import type { RoomPoint } from "@/lib/seatGeometry";

export type { BaseRoomInfo, LibraryRoom, RoomVersionData };

/**
 * Biblioteca de salones (consultas). Un lugar privado lo ven la persona que lo guardó y la boda
 * desde la que se guardó; uno de plataforma lo ve todo el mundo. Los archivados no salen en la
 * biblioteca, pero sus versiones siguen sirviendo a los layouts que ya las usan.
 */

export type LibraryViewer = { userId: string; weddingId: string; isAdmin?: boolean };

export const OBJECT_ID = /^[a-f0-9]{24}$/i;

// En MongoDB, `archivedAt: null` no encuentra los documentos sin el campo: se piden ambos casos.
export const NOT_ARCHIVED = { OR: [{ archivedAt: null }, { archivedAt: { isSet: false } }] };

/** Lugares que ve alguien desde una boda (sin archivados). */
export function visibleVenueWhere(viewer: LibraryViewer): Prisma.VenueWhereInput {
  return {
    AND: [NOT_ARCHIVED, { OR: [{ visibility: "platform" }, { createdById: viewer.userId }, { weddingId: viewer.weddingId }] }],
  };
}

/** ¿Puede ver este lugar (aunque esté archivado, p. ej. para mostrar la versión que ya usa)? */
export function canViewVenue(venue: { visibility: string; createdById: string; weddingId: string | null }, viewer: LibraryViewer) {
  return !!viewer.isAdmin || venue.visibility === "platform" || venue.createdById === viewer.userId || venue.weddingId === viewer.weddingId;
}

/**
 * ¿Puede agregarle salones o versiones? Su autor o la boda desde la que se guardó, mientras sea
 * privado; uno de plataforma solo lo cambia un administrador.
 */
export function canEditVenue(
  venue: { visibility: string; createdById: string; weddingId: string | null; archivedAt: Date | null },
  viewer: LibraryViewer
) {
  if (viewer.isAdmin) return true;
  if (venue.archivedAt || venue.visibility === "platform") return false;
  return venue.createdById === viewer.userId || venue.weddingId === viewer.weddingId;
}


export function versionToData(v: VenueRoomVersion): RoomVersionData {
  return {
    id: v.id,
    roomId: v.roomId,
    version: v.version,
    createdAt: v.createdAt.toISOString(),
    roomShape: v.roomShape as RoomPoint[],
    roomFixtures: (v.roomFixtures ?? []) as RoomFixture[],
    pxPerMeter: v.pxPerMeter,
    canvasWidth: v.canvasWidth,
    canvasHeight: v.canvasHeight,
    background: v.background === "garden" ? "garden" : "indoor",
    backgroundImage: (v.backgroundImage ?? null) as PlanImage | null,
  };
}

const MAX_LIBRARY_ROOMS = 300;

/** Salones que ve alguien desde su boda, con su última versión para la vista previa. */
export async function listVisibleRooms(viewer: LibraryViewer): Promise<LibraryRoom[]> {
  const venues = await prisma.venue.findMany({ where: visibleVenueWhere(viewer), orderBy: { name: "asc" }, take: MAX_LIBRARY_ROOMS });
  if (venues.length === 0) return [];
  const rooms = await prisma.venueRoom.findMany({
    where: { venueId: { in: venues.map((v) => v.id) }, ...NOT_ARCHIVED },
    orderBy: { name: "asc" },
    take: MAX_LIBRARY_ROOMS,
  });
  const latest = await latestVersions(rooms.map((r) => r.id));
  const venueById = new Map(venues.map((v) => [v.id, v]));

  return rooms.flatMap((room) => {
    const venue = venueById.get(room.venueId);
    if (!venue) return [];
    const version = latest.get(room.id);
    const data = version ? versionToData(version) : null;
    return [
      {
        id: room.id,
        name: room.name,
        banquetCapacity: room.banquetCapacity ?? null,
        cocktailCapacity: room.cocktailCapacity ?? null,
        theaterCapacity: room.theaterCapacity ?? null,
        venue: { id: venue.id, name: venue.name, city: venue.city, address: venue.address, visibility: parseVisibility(venue.visibility) },
        editable: canEditVenue(venue, viewer),
        latest: data,
        sizeMeters: data ? layerSizeMeters(data) : null,
      },
    ];
  });
}

/** Última versión de cada salón (una consulta por lote, no una por salón). */
export async function latestVersions(roomIds: string[]) {
  const result = new Map<string, VenueRoomVersion>();
  if (roomIds.length === 0) return result;
  const versions = await prisma.venueRoomVersion.findMany({
    where: { roomId: { in: roomIds } },
    orderBy: [{ roomId: "asc" }, { version: "desc" }],
  });
  for (const v of versions) if (!result.has(v.roomId)) result.set(v.roomId, v);
  return result;
}

/** Una versión, solo si su lugar es visible para quien la pide. */
export async function getVisibleVersion(versionId: string, viewer: LibraryViewer) {
  if (!OBJECT_ID.test(versionId)) return null;
  const version = await prisma.venueRoomVersion.findUnique({ where: { id: versionId } });
  if (!version) return null;
  const room = await prisma.venueRoom.findUnique({ where: { id: version.roomId } });
  const venue = room && (await prisma.venue.findUnique({ where: { id: room.venueId } }));
  if (!room || !venue || !canViewVenue(venue, viewer)) return null;
  return { version, room, venue };
}

/**
 * ¿Puede esta boda guardar este plano (en un layout o en la biblioteca)? Solo los que subió ella
 * (floorplans/<boda>/…) o el de un salón de la biblioteca que ve, al copiarlo. /api/uploads deja
 * ver un plano a quien lo tiene en un layout o en una versión de la biblioteca: sin esta revisión,
 * bastaría conocer la URL de un plano ajeno para darse acceso.
 */
export async function canUsePlanUrl(url: string, viewer: LibraryViewer): Promise<boolean> {
  const owner = planUploadWeddingId(url);
  if (!owner) return false;
  if (owner === viewer.weddingId.toLowerCase()) return true;
  const versions = await prisma.venueRoomVersion.findMany({
    where: { backgroundImage: { is: { url } } },
    select: { roomId: true },
    take: 50,
  });
  if (versions.length === 0) return false;
  const rooms = await prisma.venueRoom.findMany({ where: { id: { in: versions.map((v) => v.roomId) } }, select: { venueId: true } });
  const venues = await prisma.venue.findMany({
    where: { id: { in: rooms.map((r) => r.venueId) } },
    select: { visibility: true, createdById: true, weddingId: true },
  });
  return venues.some((venue) => canViewVenue(venue, viewer));
}

/**
 * Plano recibido del cliente, validado y solo si la boda puede usarlo (ver canUsePlanUrl).
 * `keepUrl` = el que ya tiene guardado (se validó al guardarlo): el autoguardado no vuelve a
 * consultar la base de datos por él.
 */
export async function sanitizeOwnedPlanImage(raw: unknown, viewer: LibraryViewer, keepUrl?: string | null): Promise<PlanImage | null> {
  const image = sanitizePlanImage(raw);
  if (!image) return null;
  if (image.url === keepUrl || (await canUsePlanUrl(image.url, viewer))) return image;
  return null;
}

/** Info de los salones base de varios layouts (por baseRoomVersionId). Ignora referencias rotas. */
export async function baseRoomInfos(versionIds: string[]): Promise<Map<string, BaseRoomInfo>> {
  const result = new Map<string, BaseRoomInfo>();
  const ids = [...new Set(versionIds.filter((id) => OBJECT_ID.test(id)))];
  if (ids.length === 0) return result;
  const versions = await prisma.venueRoomVersion.findMany({
    where: { id: { in: ids } },
    select: { id: true, roomId: true, version: true },
  });
  const rooms = await prisma.venueRoom.findMany({ where: { id: { in: versions.map((v) => v.roomId) } } });
  const venues = await prisma.venue.findMany({
    where: { id: { in: rooms.map((r) => r.venueId) } },
    select: { id: true, name: true, archivedAt: true },
  });
  const latest = await latestVersions(rooms.map((r) => r.id));
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const venueById = new Map(venues.map((v) => [v.id, v]));
  for (const v of versions) {
    const room = roomById.get(v.roomId);
    const last = room && latest.get(room.id);
    if (!room || !last) continue;
    // Un salón (o lugar) archivado no ofrece actualizaciones: se queda en la versión que ya usa.
    const archived = !!room.archivedAt || !!venueById.get(room.venueId)?.archivedAt;
    result.set(v.id, {
      versionId: v.id,
      version: v.version,
      roomId: room.id,
      roomName: room.name,
      venueName: venueById.get(room.venueId)?.name ?? "",
      banquetCapacity: room.banquetCapacity ?? null,
      latestVersionId: archived ? v.id : last.id,
      latestVersion: archived ? v.version : last.version,
    });
  }
  return result;
}

/**
 * Crea la siguiente versión de un salón. El número sale de la última + 1; si otra persona guarda
 * al mismo tiempo, el índice único (roomId, version) rechaza una y se reintenta.
 */
export async function createRoomVersion(roomId: string, layer: RoomLayer, createdById: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const last = await prisma.venueRoomVersion.findFirst({ where: { roomId }, orderBy: { version: "desc" }, select: { version: true } });
    try {
      return await prisma.venueRoomVersion.create({
        data: {
          roomId,
          version: (last?.version ?? 0) + 1,
          roomShape: layer.roomShape,
          roomFixtures: layer.roomFixtures,
          pxPerMeter: layer.pxPerMeter,
          canvasWidth: layer.canvasWidth,
          canvasHeight: layer.canvasHeight,
          background: layer.background,
          backgroundImage: layer.backgroundImage,
          createdById,
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    }
  }
  throw new Error("No se pudo guardar la versión del salón. Vuelve a intentarlo.");
}
