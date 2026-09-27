"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId, weddingDisplayName } from "@/lib/wedding";
import { mongoDb } from "@/lib/mongo";
import { toObjectId } from "@/lib/ids";
import { audit } from "@/lib/audit";

export async function updateWeddingDetails(formData: FormData) {
  const id = await getEditableWeddingId();

  const weddingDateRaw = formData.get("weddingDate") as string;

  const wedding = await prisma.wedding.update({
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

  // El nombre de la organización (boda) sigue a los nombres de la pareja.
  const name = weddingDisplayName(wedding);
  await mongoDb.collection("organization").updateOne({ _id: toObjectId(id) }, { $set: { name } });
  await audit("wedding.update", `Actualizó los datos de la boda ${name}`, { weddingId: id, targetId: id });

  revalidatePath("/", "layout");
}
