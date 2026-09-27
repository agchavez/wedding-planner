"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";

export async function createWeddingEvent(formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const count = await prisma.weddingEvent.count({ where: { weddingId } });

  const event = await prisma.weddingEvent.create({
    data: {
      weddingId,
      name: String(formData.get("name") ?? "").trim(),
      sortOrder: count,
    },
  });

  await audit("event.create", `Creó el evento "${event.name}"`, { weddingId, targetId: event.id });
  revalidatePath("/linea-tiempo");
  revalidatePath("/distribucion");
  return event.id;
}

export async function updateWeddingEvent(id: string, formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const event = await prisma.weddingEvent.update({
    where: { id, weddingId },
    data: { name: String(formData.get("name") ?? "").trim() },
  });
  await audit("event.update", `Renombró el evento a "${event.name}"`, { weddingId, targetId: id });

  revalidatePath("/linea-tiempo");
  revalidatePath("/distribucion");
}

export async function deleteWeddingEvent(id: string) {
  const weddingId = await getEditableWeddingId();
  await prisma.weddingEvent.findFirstOrThrow({ where: { id, weddingId }, select: { id: true } });
  await prisma.timelineEvent.deleteMany({ where: { eventId: id, weddingId } });
  // SeatingLayout comparte el mismo id que su WeddingEvent (ver lib/seatingLayout.ts).
  await prisma.seatingLayout.deleteMany({ where: { id, weddingId } });
  const event = await prisma.weddingEvent.delete({ where: { id, weddingId } });
  await audit("event.delete", `Eliminó el evento "${event.name}" con su línea de tiempo y salón`, { weddingId, targetId: id });


  revalidatePath("/linea-tiempo");
  revalidatePath("/distribucion");
}
