"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";

/** Valida que la categoría elegida pertenezca a la boda del usuario. */
async function ownedCategoryId(weddingId: string, formData: FormData) {
  const category = await prisma.expenseCategory.findFirstOrThrow({
    where: { id: String(formData.get("categoryId") ?? ""), weddingId },
    select: { id: true },
  });
  return category.id;
}

export async function createExpense(formData: FormData) {
  const weddingId = await getActiveWeddingId();
  const dueDateRaw = formData.get("dueDate") as string;
  const categoryId = await ownedCategoryId(weddingId, formData);

  await prisma.expense.create({
    data: {
      weddingId,
      categoryId,
      description: String(formData.get("description") ?? "").trim(),
      vendor: String(formData.get("vendor") ?? ""),
      estimatedAmount: Number(formData.get("estimatedAmount") ?? 0),
      actualAmount: Number(formData.get("actualAmount") ?? 0),
      amountPaid: Number(formData.get("amountPaid") ?? 0),
      paymentStatus: String(formData.get("paymentStatus") ?? "pending"),
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      notes: String(formData.get("notes") ?? ""),
    },
  });

  revalidatePath("/gastos");
  revalidatePath("/presupuesto");
  revalidatePath("/");
}

export async function updateExpense(id: string, formData: FormData) {
  const weddingId = await getActiveWeddingId();
  const categoryId = await ownedCategoryId(weddingId, formData);
  const dueDateRaw = formData.get("dueDate") as string;
  const paymentStatus = String(formData.get("paymentStatus") ?? "pending");

  await prisma.expense.update({
    where: { id, weddingId },
    data: {
      categoryId,
      description: String(formData.get("description") ?? "").trim(),
      vendor: String(formData.get("vendor") ?? ""),
      estimatedAmount: Number(formData.get("estimatedAmount") ?? 0),
      actualAmount: Number(formData.get("actualAmount") ?? 0),
      amountPaid: Number(formData.get("amountPaid") ?? 0),
      paymentStatus,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      paidDate: paymentStatus === "paid" ? new Date() : null,
      notes: String(formData.get("notes") ?? ""),
    },
  });

  revalidatePath("/gastos");
  revalidatePath("/presupuesto");
  revalidatePath("/");
}

export async function deleteExpense(id: string) {
  const weddingId = await getActiveWeddingId();
  await prisma.expense.delete({ where: { id, weddingId } });
  revalidatePath("/gastos");
  revalidatePath("/presupuesto");
  revalidatePath("/");
}
