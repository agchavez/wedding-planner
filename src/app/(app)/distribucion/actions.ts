"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { clampCanvasSize, getOrCreateSeatingLayout, sanitizeElement, sanitizeRoomShape } from "@/lib/seatingLayout";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";
import type { RoomPoint } from "@/lib/seatGeometry";
import type { LayoutElement } from "@/generated/prisma";

export async function saveLayout(
  eventId: string,
  elements: LayoutElement[],
  canvasWidth: number,
  canvasHeight: number,
  background: string,
  roomShape: RoomPoint[] = []
) {
  const weddingId = await getEditableWeddingId();
  const layout = await getOrCreateSeatingLayout(eventId);
  const sanitized = elements.map(sanitizeElement).filter((el): el is LayoutElement => el !== null);
  const sanitizedRoomShape = sanitizeRoomShape(roomShape);

  await prisma.seatingLayout.update({
    where: { id: layout.id },
    data: {
      elements: sanitized,
      canvasWidth: clampCanvasSize(canvasWidth),
      canvasHeight: clampCanvasSize(canvasHeight),
      background: background === "garden" ? "garden" : "indoor",
      roomShape: sanitizedRoomShape.length >= 3 ? sanitizedRoomShape : [],
    },
  });

  // Se autoguarda en cada cambio: un evento cada 10 minutos por salón basta.
  await audit("layout.save", "Editó la distribución del salón", { weddingId, targetId: eventId, dedupeMinutes: 10 });

  revalidatePath("/distribucion");
  revalidatePath("/invitados");
}
