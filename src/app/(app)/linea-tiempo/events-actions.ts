"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";

export async function createWeddingEvent(formData: FormData) {
  const weddingId = await getActiveWeddingId();
  const count = await prisma.weddingEvent.count({ where: { weddingId } });

  const event = await prisma.weddingEvent.create({
    data: {
      weddingId,
      name: String(formData.get("name") ?? "").trim(),
      sortOrder: count,
    },
  });

  revalidatePath("/linea-tiempo");
  revalidatePath("/distribucion");
  return event.id;
}

export async function updateWeddingEvent(id: string, formData: FormData) {
  const weddingId = await getActiveWeddingId();
  await prisma.weddingEvent.update({
    where: { id, weddingId },
    data: { name: String(formData.get("name") ?? "").trim() },
  });

  revalidatePath("/linea-tiempo");
  revalidatePath("/distribucion");
}

export async function deleteWeddingEvent(id: string) {
  const weddingId = await getActiveWeddingId();
  await prisma.weddingEvent.findFirstOrThrow({ where: { id, weddingId }, select: { id: true } });
  await prisma.timelineEvent.deleteMany({ where: { eventId: id, weddingId } });
  // SeatingLayout comparte el mismo id que su WeddingEvent (ver lib/seatingLayout.ts).
  await prisma.seatingLayout.deleteMany({ where: { id, weddingId } });
  await prisma.weddingEvent.delete({ where: { id, weddingId } });

  revalidatePath("/linea-tiempo");
  revalidatePath("/distribucion");
}
