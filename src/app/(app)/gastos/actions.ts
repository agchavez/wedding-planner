"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";
import { parseDateOnly } from "@/lib/format";

/** Valida que la categoría elegida pertenezca a la boda del usuario. */
async function ownedCategoryId(weddingId: string, formData: FormData) {
  const category = await prisma.expenseCategory.findFirstOrThrow({
    where: { id: String(formData.get("categoryId") ?? ""), weddingId },
    select: { id: true },
  });
  return category.id;
}

export async function createExpense(formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const dueDateRaw = formData.get("dueDate") as string;
  const categoryId = await ownedCategoryId(weddingId, formData);

  const expense = await prisma.expense.create({
    data: {
      weddingId,
      categoryId,
      description: String(formData.get("description") ?? "").trim(),
      vendor: String(formData.get("vendor") ?? ""),
      estimatedAmount: Number(formData.get("estimatedAmount") ?? 0),
      actualAmount: Number(formData.get("actualAmount") ?? 0),
      amountPaid: Number(formData.get("amountPaid") ?? 0),
      paymentStatus: String(formData.get("paymentStatus") ?? "pending"),
      dueDate: parseDateOnly(dueDateRaw),
      notes: String(formData.get("notes") ?? ""),
    },
  });
  await audit("expense.create", `Registró el gasto "${expense.description}"`, { weddingId, targetId: expense.id });

  revalidatePath("/gastos");
  revalidatePath("/presupuesto");
  revalidatePath("/");
}

export async function updateExpense(id: string, formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const categoryId = await ownedCategoryId(weddingId, formData);
  const dueDateRaw = formData.get("dueDate") as string;
  const paymentStatus = String(formData.get("paymentStatus") ?? "pending");

  const expense = await prisma.expense.update({
    where: { id, weddingId },
    data: {
      categoryId,
      description: String(formData.get("description") ?? "").trim(),
      vendor: String(formData.get("vendor") ?? ""),
      estimatedAmount: Number(formData.get("estimatedAmount") ?? 0),
      actualAmount: Number(formData.get("actualAmount") ?? 0),
      amountPaid: Number(formData.get("amountPaid") ?? 0),
      paymentStatus,
      dueDate: parseDateOnly(dueDateRaw),
      paidDate: paymentStatus === "paid" ? new Date() : null,
      notes: String(formData.get("notes") ?? ""),
    },
  });
  await audit("expense.update", `Editó el gasto "${expense.description}" (${expense.paymentStatus === "paid" ? "pagado" : expense.paymentStatus === "partially_paid" ? "pago parcial" : "pendiente"})`, { weddingId, targetId: id });

  revalidatePath("/gastos");
  revalidatePath("/presupuesto");
  revalidatePath("/");
}

export async function deleteExpense(id: string) {
  const weddingId = await getEditableWeddingId();
  const expense = await prisma.expense.delete({ where: { id, weddingId } });
  await audit("expense.delete", `Eliminó el gasto "${expense.description}"`, { weddingId, targetId: id });

  revalidatePath("/gastos");
  revalidatePath("/presupuesto");
  revalidatePath("/");
}
