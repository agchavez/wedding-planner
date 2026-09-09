"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";

function parsePlusOneNames(raw: string): string[] {
  return raw
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

export async function createGuest(formData: FormData) {
  const weddingId = await getActiveWeddingId();

  await prisma.guest.create({
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

  revalidatePath("/invitados");
  revalidatePath("/");
}

export async function updateGuest(id: string, formData: FormData) {
  await prisma.guest.update({
    where: { id },
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

  revalidatePath("/invitados");
  revalidatePath("/");
}

export async function deleteGuest(id: string) {
  await prisma.guest.delete({ where: { id } });
  revalidatePath("/invitados");
  revalidatePath("/");
}

export async function assignGuestTable(id: string, tableElementId: string | null) {
  await prisma.guest.update({
    where: { id },
    data: { tableElementId },
  });
  revalidatePath("/invitados");
  revalidatePath("/distribucion");
}
