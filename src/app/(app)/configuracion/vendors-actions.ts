"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";

function vendorData(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    contactName: String(formData.get("contactName") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };
}

export async function createVendor(formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const item = await prisma.vendor.create({ data: { weddingId, ...vendorData(formData) } });
  await audit("vendor.create", `Creó el proveedor "${item.name}"`, { weddingId, targetId: item.id });

  revalidatePath("/configuracion");
  revalidatePath("/gastos");
}

export async function updateVendor(id: string, formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const item = await prisma.vendor.update({ where: { id, weddingId }, data: vendorData(formData) });
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
