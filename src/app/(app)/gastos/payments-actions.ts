"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";
import { recomputeExpensePaid } from "@/lib/expensePayments";
import { formatMoney, parseDateOnly } from "@/lib/format";
import { saveUploadedFile } from "@/lib/uploads";

/** Valida que el gasto pertenezca a la boda del usuario (ExpensePayment no guarda weddingId). */
async function ownedExpense(weddingId: string, expenseId: string) {
  return prisma.expense.findFirstOrThrow({ where: { id: expenseId, weddingId }, select: { id: true, description: true } });
}

/** La cuenta elegida (si hay) debe pertenecer a la boda. */
async function ownedAccountId(weddingId: string, formData: FormData) {
  const raw = String(formData.get("accountId") ?? "");
  if (!raw || raw === "none") return null;
  const account = await prisma.account.findFirst({ where: { id: raw, weddingId }, select: { id: true } });
  return account?.id ?? null;
}

function revalidate() {
  revalidatePath("/gastos");
  revalidatePath("/presupuesto");
  revalidatePath("/");
}

export async function createPayment(expenseId: string, formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const expense = await ownedExpense(weddingId, expenseId);
  const receipt = formData.get("receipt");
  const saved = receipt instanceof File ? await saveUploadedFile(receipt, "receipts") : null;

  const payment = await prisma.expensePayment.create({
    data: {
      expenseId,
      accountId: await ownedAccountId(weddingId, formData),
      amount: Number(formData.get("amount") ?? 0),
      date: parseDateOnly(formData.get("date")),
      notes: String(formData.get("notes") ?? "").trim(),
      receiptUrl: saved?.url ?? "",
      receiptName: saved?.name ?? "",
    },
  });
  await recomputeExpensePaid(expenseId);
  await audit("payment.create", `Registró un pago de ${formatMoney(payment.amount)} al gasto "${expense.description}"`, { weddingId, targetId: payment.id });

  revalidate();
}

export async function updatePayment(paymentId: string, expenseId: string, formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const expense = await ownedExpense(weddingId, expenseId);
  const receipt = formData.get("receipt");
  const saved = receipt instanceof File ? await saveUploadedFile(receipt, "receipts") : null;

  const payment = await prisma.expensePayment.update({
    where: { id: paymentId, expenseId },
    data: {
      accountId: await ownedAccountId(weddingId, formData),
      amount: Number(formData.get("amount") ?? 0),
      date: parseDateOnly(formData.get("date")),
      notes: String(formData.get("notes") ?? "").trim(),
      ...(saved ? { receiptUrl: saved.url, receiptName: saved.name } : {}),
    },
  });
  await recomputeExpensePaid(expenseId);
  await audit("payment.update", `Editó un pago (${formatMoney(payment.amount)}) del gasto "${expense.description}"`, { weddingId, targetId: paymentId });

  revalidate();
}

export async function deletePayment(paymentId: string, expenseId: string) {
  const weddingId = await getEditableWeddingId();
  const expense = await ownedExpense(weddingId, expenseId);
  const payment = await prisma.expensePayment.delete({ where: { id: paymentId, expenseId } });
  await recomputeExpensePaid(expenseId);
  await audit("payment.delete", `Eliminó un pago de ${formatMoney(payment.amount)} del gasto "${expense.description}"`, { weddingId, targetId: paymentId });

  revalidate();
}
