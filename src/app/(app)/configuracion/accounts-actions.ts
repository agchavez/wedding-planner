"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";
import { checkCatalogName } from "@/lib/catalog-server";

function accountData(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };
}

export async function createAccount(formData: FormData): Promise<{ error: string } | void> {
  const weddingId = await getEditableWeddingId();
  const check = await checkCatalogName("account", weddingId, formData.get("name"));
  if (!check.ok) return { error: check.error };
  const item = await prisma.account.create({ data: { weddingId, ...accountData(formData), name: check.name } });
  await audit("account.create", `Creó la cuenta "${item.name}"`, { weddingId, targetId: item.id });

  revalidatePath("/configuracion");
  revalidatePath("/gastos");
}

export async function updateAccount(id: string, formData: FormData): Promise<{ error: string } | void> {
  const weddingId = await getEditableWeddingId();
  const check = await checkCatalogName("account", weddingId, formData.get("name"), id);
  if (!check.ok) return { error: check.error };
  const item = await prisma.account.update({ where: { id, weddingId }, data: { ...accountData(formData), name: check.name } });
  await audit("account.update", `Editó la cuenta "${item.name}"`, { weddingId, targetId: id });

  revalidatePath("/configuracion");
  revalidatePath("/gastos");
}

export async function deleteAccount(id: string) {
  const weddingId = await getEditableWeddingId();
  const item = await prisma.account.delete({ where: { id, weddingId } });
  await audit("account.delete", `Eliminó la cuenta "${item.name}"`, { weddingId, targetId: id });

  revalidatePath("/configuracion");
  revalidatePath("/gastos");
}
