"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";
import { saveUploadedFile } from "@/lib/uploads";
import { sanitizeRoomShape } from "@/lib/seatingLayout";
import { sanitizeRoomFixtures } from "@/lib/roomFixtures";
import { clampCanvasSize, resolvePxPerMeter } from "@/lib/layoutUnits";
import { hasRoomContent, parseCapacity, type RoomLayer } from "@/lib/venueLibrary";
import {
  baseRoomInfos,
  canEditVenue,
  createRoomVersion,
  getVisibleVersion,
  listVisibleRooms,
  OBJECT_ID,
  sanitizeOwnedPlanImage,
  versionToData,
  type BaseRoomInfo,
  type LibraryRoom,
  type LibraryViewer,
  type RoomVersionData,
} from "@/lib/venueRooms";

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

/** Quien usa la biblioteca desde el editor: debe poder editar la boda activa. */
async function viewer(): Promise<LibraryViewer & { userName: string }> {
  const { user } = await requireSession();
  const weddingId = await getEditableWeddingId();
  return { userId: user.id, userName: user.name, weddingId, isAdmin: user.role === "admin" };
}

/**
 * Salones de la biblioteca que ve la boda activa (los suyos, los de quien pregunta y los de
 * plataforma). Solo para quien puede editar la boda: es quien puede usar o guardar salones.
 */
export async function listLibraryRooms(): Promise<LibraryRoom[]> {
  return listVisibleRooms(await viewer());
}

/** Una versión de un salón visible, para copiarla al plano. */
export async function getLibraryRoomVersion(versionId: string): Promise<(RoomVersionData & { info: BaseRoomInfo }) | null> {
  const found = await getVisibleVersion(String(versionId), await viewer());
  if (!found) return null;
  const info = (await baseRoomInfos([found.version.id])).get(found.version.id);
  return info ? { ...versionToData(found.version), info } : null;
}

const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

export type SaveRoomInput = {
  /** Versión nueva de este salón; sin roomId se crea un salón nuevo. */
  roomId?: string;
  /** Lugar existente para el salón nuevo; sin venueId se crea un lugar con `venue`. */
  venueId?: string;
  venue?: { name: string; city?: string; address?: string; notes?: string };
  roomName?: string;
  banquetCapacity?: number | string | null;
  cocktailCapacity?: number | string | null;
  theaterCapacity?: number | string | null;
  layer: RoomLayer;
};

/**
 * Guarda la capa salón actual en la biblioteca: como versión nueva de un salón existente o como
 * salón nuevo (en un lugar nuevo o en uno propio). Siempre queda privado: solo un administrador
 * lo publica para toda la plataforma. El layout no se toca aquí: el editor guarda el vínculo
 * (baseRoomVersionId) con su autoguardado.
 */
export async function saveRoomToLibrary(input: SaveRoomInput): Promise<Result<{ info: BaseRoomInfo }>> {
  const v = await viewer();
  const raw = input?.layer;
  const shape = sanitizeRoomShape(raw?.roomShape ?? []);
  const layer: RoomLayer = {
    roomShape: shape.length >= 3 ? shape : [],
    roomFixtures: sanitizeRoomFixtures(raw?.roomFixtures),
    pxPerMeter: resolvePxPerMeter(raw?.pxPerMeter),
    canvasWidth: Math.round(clampCanvasSize(Number(raw?.canvasWidth) || 2000)),
    canvasHeight: Math.round(clampCanvasSize(Number(raw?.canvasHeight) || 1400)),
    background: raw?.background === "garden" ? "garden" : "indoor",
    // Solo un plano de esta boda o de un salón de la biblioteca que ve (ver canUsePlanUrl).
    backgroundImage: await sanitizeOwnedPlanImage(raw?.backgroundImage, v),
  };
  if (!hasRoomContent(layer)) {
    return { ok: false, error: "El salón está vacío: define el contorno, agrega paredes o importa un plano antes de guardarlo." };
  }

  let roomId: string;
  if (input.roomId) {
    if (!OBJECT_ID.test(input.roomId)) return { ok: false, error: "Salón no válido." };
    const room = await prisma.venueRoom.findUnique({ where: { id: input.roomId } });
    const venue = room && (await prisma.venue.findUnique({ where: { id: room.venueId } }));
    if (!room || !venue || room.archivedAt || !canEditVenue(venue, v)) {
      return { ok: false, error: "No puedes guardar versiones de ese salón. Guárdalo como salón nuevo." };
    }
    roomId = room.id;
  } else {
    const roomName = text(input.roomName, 80);
    if (!roomName) return { ok: false, error: "Escribe el nombre del salón." };
    let venueId: string;
    if (input.venueId) {
      if (!OBJECT_ID.test(input.venueId)) return { ok: false, error: "Lugar no válido." };
      const venue = await prisma.venue.findUnique({ where: { id: input.venueId } });
      if (!venue || !canEditVenue(venue, v)) return { ok: false, error: "No puedes agregar salones a ese lugar." };
      venueId = venue.id;
    } else {
      const name = text(input.venue?.name, 100);
      if (!name) return { ok: false, error: "Escribe el nombre del lugar." };
      const venue = await prisma.venue.create({
        data: {
          name,
          city: text(input.venue?.city, 80),
          address: text(input.venue?.address, 200),
          notes: text(input.venue?.notes, 1000),
          visibility: "private",
          createdById: v.userId,
          createdByName: v.userName,
          weddingId: v.weddingId,
        },
      });
      venueId = venue.id;
    }
    const room = await prisma.venueRoom.create({
      data: {
        venueId,
        name: roomName,
        banquetCapacity: parseCapacity(input.banquetCapacity),
        cocktailCapacity: parseCapacity(input.cocktailCapacity),
        theaterCapacity: parseCapacity(input.theaterCapacity),
      },
    });
    roomId = room.id;
  }

  const version = await createRoomVersion(roomId, layer, v.userId);
  const info = (await baseRoomInfos([version.id])).get(version.id);
  if (!info) return { ok: false, error: "No se pudo leer el salón guardado." };
  await audit(
    "venue.save_room",
    `Guardó el salón "${info.roomName}" (${info.venueName}) en la biblioteca, versión ${info.version}`,
    { weddingId: v.weddingId, targetId: roomId }
  );
  revalidatePath("/admin/salones");
  return { ok: true, info };
}

const PLAN_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/**
 * Sube la imagen del plano del salón. Va a uploads/floorplans/<boda>/ y se sirve con control de
 * acceso (ver /api/uploads). El editor la pone de fondo y la guarda con su autoguardado.
 */
export async function uploadFloorPlan(formData: FormData): Promise<Result<{ url: string }>> {
  const weddingId = await getEditableWeddingId();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Elige una imagen del plano." };
  if (!PLAN_TYPES.includes(file.type)) {
    return { ok: false, error: "El plano debe ser una imagen PNG, JPG o WebP. Si lo tienes en PDF, expórtalo como imagen." };
  }
  try {
    const saved = await saveUploadedFile(file, `floorplans/${weddingId}`);
    if (!saved) return { ok: false, error: "Elige una imagen del plano." };
    await audit("layout.floor_plan", "Subió el plano del salón", { weddingId });
    return { ok: true, url: saved.url };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo subir el plano." };
  }
}
