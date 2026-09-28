"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";
import { checkCatalogName } from "@/lib/catalog-server";

function vendorData(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    contactName: String(formData.get("contactName") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };
}

export async function createVendor(formData: FormData): Promise<{ error: string } | void> {
  const weddingId = await getEditableWeddingId();
  const check = await checkCatalogName("vendor", weddingId, formData.get("name"));
  if (!check.ok) return { error: check.error };
  const item = await prisma.vendor.create({ data: { weddingId, ...vendorData(formData), name: check.name } });
  await audit("vendor.create", `Creó el proveedor "${item.name}"`, { weddingId, targetId: item.id });

  revalidatePath("/configuracion");
  revalidatePath("/gastos");
}

export async function updateVendor(id: string, formData: FormData): Promise<{ error: string } | void> {
  const weddingId = await getEditableWeddingId();
  const check = await checkCatalogName("vendor", weddingId, formData.get("name"), id);
  if (!check.ok) return { error: check.error };
  const item = await prisma.vendor.update({ where: { id, weddingId }, data: { ...vendorData(formData), name: check.name } });
  await audit("vendor.update", `Editó el proveedor "${item.name}"`, { weddingId, targetId: id });

  revalidatePath("/configuracion");
  revalidatePath("/gastos");
}

export async function deleteVendor(id: string) {
  const weddingId = await getEditableWeddingId();
  const item = await prisma.vendor.delete({ where: { id, weddingId } });
  await audit("vendor.delete", `Eliminó el proveedor "${item.name}"`, { weddingId, targetId: id });

  revalidatePath("/configuracion");
  revalidatePath("/gastos");
}
