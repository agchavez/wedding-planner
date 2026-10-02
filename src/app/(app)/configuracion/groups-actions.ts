"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";
import { checkCatalogName } from "@/lib/catalog-server";

function guestGroupData(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
  };
}

export async function createGroup(formData: FormData): Promise<{ error: string } | void> {
  const weddingId = await getEditableWeddingId();
  const check = await checkCatalogName("group", weddingId, formData.get("name"));
  if (!check.ok) return { error: check.error };
  const item = await prisma.guestGroup.create({ data: { weddingId, ...guestGroupData(formData), name: check.name } });
  await audit("guest_group.create", `Creó el grupo "${item.name}"`, { weddingId, targetId: item.id });

  revalidatePath("/configuracion");
  revalidatePath("/invitados");
}

export async function updateGroup(id: string, formData: FormData): Promise<{ error: string } | void> {
  const weddingId = await getEditableWeddingId();
  const check = await checkCatalogName("group", weddingId, formData.get("name"), id);
  if (!check.ok) return { error: check.error };
  const item = await prisma.guestGroup.update({ where: { id, weddingId }, data: { ...guestGroupData(formData), name: check.name } });
  await audit("guest_group.update", `Editó el grupo "${item.name}"`, { weddingId, targetId: id });

  revalidatePath("/configuracion");
  revalidatePath("/invitados");
}

export async function deleteGroup(id: string) {
  const weddingId = await getEditableWeddingId();
  const item = await prisma.guestGroup.delete({ where: { id, weddingId } });
  await audit("guest_group.delete", `Eliminó el grupo "${item.name}"`, { weddingId, targetId: id });

  revalidatePath("/configuracion");
  revalidatePath("/invitados");
}
