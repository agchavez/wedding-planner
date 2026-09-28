"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";
import { formatMoney, parseDateOnly } from "@/lib/format";

function contributionData(formData: FormData) {
  const contributor = String(formData.get("contributor") ?? "other");

  return {
    contributor,
    otherLabel: contributor === "other" ? String(formData.get("otherLabel") ?? "").trim() : "",
    amount: Number(formData.get("amount") ?? 0),
    date: parseDateOnly(formData.get("date")),
    notes: String(formData.get("notes") ?? "").trim(),
  };
}

export async function createContribution(formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const contribution = await prisma.budgetContribution.create({
    data: { weddingId, ...contributionData(formData) },
  });
  await audit("contribution.create", `Registró un aporte de ${formatMoney(contribution.amount)}`, { weddingId, targetId: contribution.id });

  revalidatePath("/presupuesto");
  revalidatePath("/");
}

export async function updateContribution(id: string, formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const contribution = await prisma.budgetContribution.update({
    where: { id, weddingId },
    data: contributionData(formData),
  });
  await audit("contribution.update", `Editó un aporte (${formatMoney(contribution.amount)})`, { weddingId, targetId: id });

  revalidatePath("/presupuesto");
  revalidatePath("/");
}

export async function deleteContribution(id: string) {
  const weddingId = await getEditableWeddingId();
  const contribution = await prisma.budgetContribution.delete({ where: { id, weddingId } });
  await audit("contribution.delete", `Eliminó un aporte de ${formatMoney(contribution.amount)}`, { weddingId, targetId: id });

  revalidatePath("/presupuesto");
  revalidatePath("/");
}
