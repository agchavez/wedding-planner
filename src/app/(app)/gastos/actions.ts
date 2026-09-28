"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";
import { parseDateOnly } from "@/lib/format";
import { recomputeExpensePaid } from "@/lib/expensePayments";

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
      dueDate: parseDateOnly(dueDateRaw),
      notes: String(formData.get("notes") ?? ""),
    },
  });
  await audit("expense.create", `Registró el gasto "${expense.description}"`, { weddingId, targetId: expense.id });

  revalidatePath("/gastos");
  revalidatePath("/presupuesto");
  revalidatePath("/");
}

// amountPaid, paymentStatus y paidDate no se editan aquí: se recalculan automáticamente a
// partir de los pagos registrados (ver recomputeExpensePaid en payments-actions.ts).
export async function updateExpense(id: string, formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const categoryId = await ownedCategoryId(weddingId, formData);
  const dueDateRaw = formData.get("dueDate") as string;

  const expense = await prisma.expense.update({
    where: { id, weddingId },
    data: {
      categoryId,
      description: String(formData.get("description") ?? "").trim(),
      vendor: String(formData.get("vendor") ?? ""),
      estimatedAmount: Number(formData.get("estimatedAmount") ?? 0),
      actualAmount: Number(formData.get("actualAmount") ?? 0),
      dueDate: parseDateOnly(dueDateRaw),
      notes: String(formData.get("notes") ?? ""),
    },
  });
  // El monto real define si los pagos ya cubren el gasto.
  await recomputeExpensePaid(id);
  await audit("expense.update", `Editó el gasto "${expense.description}" (${expense.paymentStatus === "paid" ? "pagado" : expense.paymentStatus === "partially_paid" ? "pago parcial" : "pendiente"})`, { weddingId, targetId: id });

  revalidatePath("/gastos");
  revalidatePath("/presupuesto");
  revalidatePath("/");
}

export async function deleteExpense(id: string) {
  const weddingId = await getEditableWeddingId();
  await prisma.expense.findFirstOrThrow({ where: { id, weddingId }, select: { id: true } });
  await prisma.expensePayment.deleteMany({ where: { expenseId: id } });
  const expense = await prisma.expense.delete({ where: { id, weddingId } });
  await audit("expense.delete", `Eliminó el gasto "${expense.description}"`, { weddingId, targetId: id });

  revalidatePath("/gastos");
  revalidatePath("/presupuesto");
  revalidatePath("/");
}
