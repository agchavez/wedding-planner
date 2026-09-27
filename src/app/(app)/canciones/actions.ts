"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";

export async function createSong(formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const category = String(formData.get("category") ?? "other");
  const count = await prisma.song.count({ where: { weddingId, category } });

  const song = await prisma.song.create({
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
  await audit("song.create", `Agregó la canción "${song.title}"`, { weddingId, targetId: song.id });

  revalidatePath("/canciones");
}

export async function updateSong(id: string, formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const song = await prisma.song.update({
    where: { id, weddingId },
    data: {
      title: String(formData.get("title") ?? "").trim(),
      artist: String(formData.get("artist") ?? ""),
      category: String(formData.get("category") ?? "other"),
      mustPlay: formData.get("mustPlay") === "on",
      requestedBy: String(formData.get("requestedBy") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    },
  });
  await audit("song.update", `Editó la canción "${song.title}"`, { weddingId, targetId: id });

  revalidatePath("/canciones");
}

export async function deleteSong(id: string) {
  const weddingId = await getEditableWeddingId();
  const song = await prisma.song.delete({ where: { id, weddingId } });
  await audit("song.delete", `Eliminó la canción "${song.title}"`, { weddingId, targetId: id });

  revalidatePath("/canciones");
}

export async function reorderSongs(orderedIds: string[]) {
  const weddingId = await getEditableWeddingId();
  // Nota: MongoDB standalone (sin replica set) no soporta transacciones de Prisma,
  // así que las actualizaciones se disparan en paralelo sin atomicidad — aceptable
  // para un reordenamiento cosmético.
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.song.updateMany({ where: { id, weddingId }, data: { sortOrder: index * 1000 } })
    )
  );
  await audit("song.reorder", "Reordenó la lista de canciones", { weddingId, targetId: weddingId, dedupeMinutes: 10 });
  revalidatePath("/canciones");
}
