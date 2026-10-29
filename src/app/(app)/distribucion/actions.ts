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
import type { LayoutElement, RoomFixture } from "@/generated/prisma";

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
  pxPerMeter?: number | null
): Promise<SaveLayoutResult> {
  const weddingId = await getEditableWeddingId();
  const layout = await getOrCreateSeatingLayout(eventId);
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
