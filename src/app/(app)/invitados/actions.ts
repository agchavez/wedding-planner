"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";

function parsePlusOneNames(raw: string): string[] {
  return raw
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

export async function createGuest(formData: FormData) {
  const weddingId = await getEditableWeddingId();

  const guest = await prisma.guest.create({
    data: {
      weddingId,
      fullName: String(formData.get("fullName") ?? "").trim(),
      group: String(formData.get("group") ?? ""),
      rsvpStatus: String(formData.get("rsvpStatus") ?? "pending"),
      plusOnes: Number(formData.get("plusOnes") ?? 0),
      plusOneNames: parsePlusOneNames(String(formData.get("plusOneNames") ?? "")),
      dietaryRestrictions: String(formData.get("dietaryRestrictions") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    },
  });
  await audit("guest.create", `Agregó al invitado "${guest.fullName}"`, { weddingId, targetId: guest.id });

  revalidatePath("/invitados");
  revalidatePath("/");
}

export async function updateGuest(id: string, formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const guest = await prisma.guest.update({
    where: { id, weddingId },
    data: {
      fullName: String(formData.get("fullName") ?? "").trim(),
      group: String(formData.get("group") ?? ""),
      rsvpStatus: String(formData.get("rsvpStatus") ?? "pending"),
      plusOnes: Number(formData.get("plusOnes") ?? 0),
      plusOneNames: parsePlusOneNames(String(formData.get("plusOneNames") ?? "")),
      dietaryRestrictions: String(formData.get("dietaryRestrictions") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    },
  });
  await audit("guest.update", `Editó al invitado "${guest.fullName}"`, { weddingId, targetId: id });

  revalidatePath("/invitados");
  revalidatePath("/");
}

export async function deleteGuest(id: string) {
  const weddingId = await getEditableWeddingId();
  const guest = await prisma.guest.delete({ where: { id, weddingId } });
  await audit("guest.delete", `Eliminó al invitado "${guest.fullName}"`, { weddingId, targetId: id });

  revalidatePath("/invitados");
  revalidatePath("/");
}

export async function assignGuestTable(id: string, tableElementId: string | null) {
  const weddingId = await getEditableWeddingId();
  const guest = await prisma.guest.update({
    where: { id, weddingId },
    data: { tableElementId },
  });
  await audit("guest.assign_table", tableElementId ? `Asignó mesa a "${guest.fullName}"` : `Quitó la mesa de "${guest.fullName}"`, { weddingId, targetId: id });
  revalidatePath("/invitados");
  revalidatePath("/distribucion");
}
