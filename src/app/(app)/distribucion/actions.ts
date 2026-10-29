"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { clampCanvasSize, getOrCreateSeatingLayout, sanitizeElement, sanitizeRoomShape } from "@/lib/seatingLayout";
import { sanitizeRoomFixtures } from "@/lib/roomFixtures";
import { LAYOUT_SCHEMA_VERSION, sanitizePxPerMeter } from "@/lib/layoutUnits";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";
import type { RoomPoint } from "@/lib/seatGeometry";
import type { LayoutElement, RoomFixture } from "@/generated/prisma";

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
) {
  const weddingId = await getEditableWeddingId();
  const layout = await getOrCreateSeatingLayout(eventId);
  const sanitized = elements.map(sanitizeElement).filter((el): el is LayoutElement => el !== null);
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
        ? { roomFixtures: sanitizeRoomFixtures(roomFixtures), schemaVersion: LAYOUT_SCHEMA_VERSION }
        : {}),
      ...(scale !== null ? { pxPerMeter: scale } : {}),
    },
  });

  // Se autoguarda en cada cambio: un evento cada 10 minutos por salón basta.
  await audit("layout.save", "Editó la distribución del salón", { weddingId, targetId: eventId, dedupeMinutes: 10 });

  revalidatePath("/distribucion");
  revalidatePath("/invitados");
}
