"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { clampCanvasSize, getOrCreateSeatingLayout, sanitizeElement, sanitizeRoomShape } from "@/lib/seatingLayout";
import { MAX_ROOM_FIXTURES, sanitizeRoomFixtures } from "@/lib/roomFixtures";
import { MAX_LAYOUT_ELEMENTS } from "@/lib/seatGeometry";
import { LAYOUT_SCHEMA_VERSION, sanitizePxPerMeter } from "@/lib/layoutUnits";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";
import type { RoomPoint } from "@/lib/seatGeometry";
import { getVisibleVersion, sanitizeOwnedPlanImage, type LibraryViewer } from "@/lib/venueRooms";
import { requireSession } from "@/lib/session";
import type { LayoutElement, PlanImage, RoomFixture } from "@/generated/prisma";

/** Cuántos elementos descartó el servidor por pasar los máximos (el editor no debería llegar ahí). */
export type SaveLayoutResult = { droppedElements: number; droppedFixtures: number };

export async function saveLayout(
  eventId: string,
  elements: LayoutElement[],
  canvasWidth: number,
  canvasHeight: number,
  background: string,
  roomShape: RoomPoint[] = [],
  // Opcionales para no borrar nada si llama un cliente anterior (sin capa salón ni escala):
  // undefined = no tocar el campo; pxPerMeter null = el layout sigue con la escala por defecto.
  roomFixtures?: RoomFixture[],
  pxPerMeter?: number | null,
  // Plano de fondo y salón de la biblioteca en que se basa. undefined = no tocar (cliente anterior).
  room?: { backgroundImage?: PlanImage | null; baseRoomVersionId?: string | null }
): Promise<SaveLayoutResult> {
  const weddingId = await getEditableWeddingId();
  const layout = await getOrCreateSeatingLayout(eventId);
  const roomData = await sanitizeRoomLink(room, layout, weddingId);
  const valid = elements.map(sanitizeElement).filter((el): el is LayoutElement => el !== null);
  // Límite de elementos: evita rebasar el tamaño máximo del documento con una matriz enorme.
  const sanitized = valid.slice(0, MAX_LAYOUT_ELEMENTS);
  const fixtures = roomFixtures !== undefined ? sanitizeRoomFixtures(roomFixtures) : undefined;
  const sanitizedRoomShape = sanitizeRoomShape(roomShape);
  const scale = sanitizePxPerMeter(pxPerMeter);

  await prisma.seatingLayout.update({
    where: { id: layout.id },
    data: {
      elements: sanitized,
      canvasWidth: clampCanvasSize(canvasWidth),
      canvasHeight: clampCanvasSize(canvasHeight),
      background: background === "garden" ? "garden" : "indoor",
      roomShape: sanitizedRoomShape.length >= 3 ? sanitizedRoomShape : [],
      ...(roomFixtures !== undefined
        ? { roomFixtures: fixtures, schemaVersion: LAYOUT_SCHEMA_VERSION }
        : {}),
      ...(scale !== null ? { pxPerMeter: scale } : {}),
      ...roomData,
    },
  });

  // Se autoguarda en cada cambio: un evento cada 10 minutos por salón basta.
  await audit("layout.save", "Editó la distribución del salón", { weddingId, targetId: eventId, dedupeMinutes: 10 });

  revalidatePath("/distribucion");
  revalidatePath("/invitados");

  return {
    droppedElements: valid.length - sanitized.length,
    droppedFixtures: roomFixtures && roomFixtures.length > MAX_ROOM_FIXTURES ? roomFixtures.length - MAX_ROOM_FIXTURES : 0,
  };
}

/**
 * Campos de la capa salón ligados a la biblioteca. El vínculo a una versión solo se acepta si
 * esa versión es visible para quien guarda, y el plano solo si es de esta boda o de un salón de la
 * biblioteca que ve (se revisa solo cuando cambia, no en cada autoguardado).
 */
async function sanitizeRoomLink(
  room: { backgroundImage?: PlanImage | null; baseRoomVersionId?: string | null } | undefined,
  current: { baseRoomVersionId?: string | null; backgroundImage?: PlanImage | null },
  weddingId: string
) {
  if (!room) return {};
  // La sesión ya está en caché por request (requireSession → getSession).
  const getViewer = async (): Promise<LibraryViewer> => {
    const { user } = await requireSession();
    return { userId: user.id, weddingId, isAdmin: user.role === "admin" };
  };
  const data: { backgroundImage?: PlanImage | null; baseRoomVersionId?: string | null } = {};
  if (room.backgroundImage !== undefined) {
    data.backgroundImage = await sanitizeOwnedPlanImage(room.backgroundImage, await getViewer(), current.backgroundImage?.url);
  }
  const versionId = room.baseRoomVersionId;
  if (versionId === null) data.baseRoomVersionId = null;
  else if (typeof versionId === "string" && versionId !== (current.baseRoomVersionId ?? null)) {
    const visible = await getVisibleVersion(versionId, await getViewer());
    if (visible) data.baseRoomVersionId = versionId;
  }
  return data;
}
