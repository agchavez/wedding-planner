"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId, getActiveWedding } from "@/lib/wedding";
import { audit } from "@/lib/audit";

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
  const weddingId = await getEditableWeddingId();
  await prisma.weddingEvent.findFirstOrThrow({ where: { id: eventId, weddingId }, select: { id: true } });
  const count = await prisma.timelineEvent.count({ where: { eventId, weddingId } });
  const startTime = await timeToDate((formData.get("time") as string) || null);
  const categoryRaw = String(formData.get("category") ?? "");
  const category = categoryRaw === "none" ? "" : categoryRaw;

  const item = await prisma.timelineEvent.create({
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
  await audit("timeline.create", `Agregó "${item.title}" a la línea de tiempo`, { weddingId, targetId: item.id });

  revalidatePath("/linea-tiempo");
}

export async function updateTimelineEvent(id: string, formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const startTime = await timeToDate((formData.get("time") as string) || null);
  const categoryRaw = String(formData.get("category") ?? "");
  const category = categoryRaw === "none" ? "" : categoryRaw;

  const item = await prisma.timelineEvent.update({
    where: { id, weddingId },
    data: {
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? ""),
      startTime,
      durationMinutes: Number(formData.get("durationMinutes") ?? 0),
      category: category || null,
    },
  });
  await audit("timeline.update", `Editó "${item.title}" en la línea de tiempo`, { weddingId, targetId: id });

  revalidatePath("/linea-tiempo");
}

export async function deleteTimelineEvent(id: string) {
  const weddingId = await getEditableWeddingId();
  const item = await prisma.timelineEvent.delete({ where: { id, weddingId } });
  await audit("timeline.delete", `Eliminó "${item.title}" de la línea de tiempo`, { weddingId, targetId: id });

  revalidatePath("/linea-tiempo");
}

export async function reorderTimelineEvents(orderedIds: string[]) {
  const weddingId = await getEditableWeddingId();
  // MongoDB standalone (sin replica set) no soporta transacciones de Prisma — se
  // disparan en paralelo sin atomicidad, aceptable para un reordenamiento cosmético.
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.timelineEvent.updateMany({ where: { id, weddingId }, data: { sortOrder: index * 1000 } })
    )
  );
  await audit("timeline.reorder", "Reordenó la línea de tiempo", { weddingId, targetId: weddingId, dedupeMinutes: 10 });
  revalidatePath("/linea-tiempo");
}
