"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";
import { deleteDriveFile, disconnectGoogleDrive, uploadFileToDrive } from "@/lib/googleDrive";

export async function createMediaItem(formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const label = String(formData.get("label") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const urlInput = String(formData.get("url") ?? "").trim();
  const typeInput = String(formData.get("type") ?? "link");
  const file = formData.get("file");

  let url = urlInput;
  let driveFileId: string | null = null;
  let type = typeInput;

  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadFileToDrive(file);
    if (!uploaded) throw new Error("Conecta Google Drive antes de subir un archivo.");
    url = uploaded.url;
    driveFileId = uploaded.driveFileId;
    type = file.type.startsWith("video/") ? "video" : "image";
  }

  if (!url) return;

  const count = await prisma.mediaItem.count({ where: { weddingId } });
  const item = await prisma.mediaItem.create({
    data: { weddingId, type, url, driveFileId, label, notes, sortOrder: count },
  });
  await audit("media.create", `Agregó "${item.label || item.url}" a Fotos`, { weddingId, targetId: item.id });

  revalidatePath("/fotos");
}

export async function updateMediaItem(id: string, formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const item = await prisma.mediaItem.update({
    where: { id, weddingId },
    data: {
      label: String(formData.get("label") ?? "").trim(),
      notes: String(formData.get("notes") ?? "").trim(),
    },
  });
  await audit("media.update", `Editó "${item.label || item.url}" en Fotos`, { weddingId, targetId: id });
  revalidatePath("/fotos");
}

export async function deleteMediaItem(id: string) {
  const weddingId = await getEditableWeddingId();
  const item = await prisma.mediaItem.findFirstOrThrow({ where: { id, weddingId } });
  if (item.driveFileId) await deleteDriveFile(item.driveFileId);
  await prisma.mediaItem.delete({ where: { id, weddingId } });
  await audit("media.delete", `Eliminó "${item.label || item.url}" de Fotos`, { weddingId, targetId: id });
  revalidatePath("/fotos");
}

export async function disconnectDrive() {
  const weddingId = await getEditableWeddingId();
  await disconnectGoogleDrive(weddingId);
  await audit("drive.disconnect", "Desconectó Google Drive", { weddingId });
  revalidatePath("/fotos");
}
