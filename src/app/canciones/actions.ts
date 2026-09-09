"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";

export async function createSong(formData: FormData) {
  const weddingId = await getActiveWeddingId();
  const category = String(formData.get("category") ?? "other");
  const count = await prisma.song.count({ where: { weddingId, category } });

  await prisma.song.create({
    data: {
      weddingId,
      title: String(formData.get("title") ?? "").trim(),
      artist: String(formData.get("artist") ?? ""),
      category,
      mustPlay: formData.get("mustPlay") === "on",
      requestedBy: String(formData.get("requestedBy") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      sortOrder: count * 1000,
    },
  });

  revalidatePath("/canciones");
}

export async function updateSong(id: string, formData: FormData) {
  await prisma.song.update({
    where: { id },
    data: {
      title: String(formData.get("title") ?? "").trim(),
      artist: String(formData.get("artist") ?? ""),
      category: String(formData.get("category") ?? "other"),
      mustPlay: formData.get("mustPlay") === "on",
      requestedBy: String(formData.get("requestedBy") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    },
  });

  revalidatePath("/canciones");
}

export async function deleteSong(id: string) {
  await prisma.song.delete({ where: { id } });
  revalidatePath("/canciones");
}

export async function reorderSongs(orderedIds: string[]) {
  // Nota: MongoDB standalone (sin replica set) no soporta transacciones de Prisma,
  // así que las actualizaciones se disparan en paralelo sin atomicidad — aceptable
  // para un reordenamiento cosmético de una app de un solo usuario.
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.song.update({ where: { id }, data: { sortOrder: index * 1000 } })
    )
  );
  revalidatePath("/canciones");
}
