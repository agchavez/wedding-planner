"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";

export async function updateWeddingDetails(formData: FormData) {
  const id = await getActiveWeddingId();

  const weddingDateRaw = formData.get("weddingDate") as string;

  await prisma.wedding.update({
    where: { id },
    data: {
      partner1: String(formData.get("partner1") ?? ""),
      partner2: String(formData.get("partner2") ?? ""),
      venueName: String(formData.get("venueName") ?? ""),
      venueAddress: String(formData.get("venueAddress") ?? ""),
      totalBudget: Number(formData.get("totalBudget") ?? 0),
      currency: String(formData.get("currency") ?? "HNL"),
      weddingDate: weddingDateRaw ? new Date(weddingDateRaw) : null,
    },
  });

  revalidatePath("/");
}
