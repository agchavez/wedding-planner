"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId, getActiveWedding } from "@/lib/wedding";

/** Combina una hora "HH:mm" con el día de la boda (o hoy si todavía no está definido). */
async function timeToDate(time: string | null): Promise<Date | null> {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;

  const wedding = await getActiveWedding();
  const base = wedding.weddingDate ? new Date(wedding.weddingDate) : new Date();
  base.setHours(h, m, 0, 0);
  return base;
}

export async function createTimelineEvent(eventId: string, formData: FormData) {
  const weddingId = await getActiveWeddingId();
  const count = await prisma.timelineEvent.count({ where: { eventId } });
  const startTime = await timeToDate((formData.get("time") as string) || null);
  const categoryRaw = String(formData.get("category") ?? "");
  const category = categoryRaw === "none" ? "" : categoryRaw;

  await prisma.timelineEvent.create({
    data: {
      weddingId,
      eventId,
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? ""),
      startTime,
      durationMinutes: Number(formData.get("durationMinutes") ?? 0),
      category: category || null,
      sortOrder: count * 1000,
    },
  });

  revalidatePath("/linea-tiempo");
}

export async function updateTimelineEvent(id: string, formData: FormData) {
  const startTime = await timeToDate((formData.get("time") as string) || null);
  const categoryRaw = String(formData.get("category") ?? "");
  const category = categoryRaw === "none" ? "" : categoryRaw;

  await prisma.timelineEvent.update({
    where: { id },
    data: {
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? ""),
      startTime,
      durationMinutes: Number(formData.get("durationMinutes") ?? 0),
      category: category || null,
    },
  });

  revalidatePath("/linea-tiempo");
}

export async function deleteTimelineEvent(id: string) {
  await prisma.timelineEvent.delete({ where: { id } });
  revalidatePath("/linea-tiempo");
}

export async function reorderTimelineEvents(orderedIds: string[]) {
  // MongoDB standalone (sin replica set) no soporta transacciones de Prisma — se
  // disparan en paralelo sin atomicidad, aceptable para un reordenamiento cosmético.
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.timelineEvent.update({ where: { id }, data: { sortOrder: index * 1000 } })
    )
  );
  revalidatePath("/linea-tiempo");
}
