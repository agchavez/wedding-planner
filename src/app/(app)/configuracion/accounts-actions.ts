"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";

function accountData(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };
}

export async function createAccount(formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const item = await prisma.account.create({ data: { weddingId, ...accountData(formData) } });
  await audit("account.create", `Creó la cuenta "${item.name}"`, { weddingId, targetId: item.id });

  revalidatePath("/configuracion");
  revalidatePath("/gastos");
}

export async function updateAccount(id: string, formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const item = await prisma.account.update({ where: { id, weddingId }, data: accountData(formData) });
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
