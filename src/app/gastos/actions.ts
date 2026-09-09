"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";

export async function createExpense(formData: FormData) {
  const weddingId = await getActiveWeddingId();
  const dueDateRaw = formData.get("dueDate") as string;

  await prisma.expense.create({
    data: {
      weddingId,
      categoryId: String(formData.get("categoryId") ?? ""),
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
  const dueDateRaw = formData.get("dueDate") as string;
  const paymentStatus = String(formData.get("paymentStatus") ?? "pending");

  await prisma.expense.update({
    where: { id },
    data: {
      categoryId: String(formData.get("categoryId") ?? ""),
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
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/gastos");
  revalidatePath("/presupuesto");
  revalidatePath("/");
}
