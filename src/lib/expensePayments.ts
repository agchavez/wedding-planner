import "server-only";
import { prisma } from "@/lib/prisma";

/** Recalcula Expense.amountPaid y paymentStatus a partir de la suma de sus ExpensePayment. */
export async function recomputeExpensePaid(expenseId: string) {
  const [payments, expense] = await Promise.all([
    prisma.expensePayment.findMany({ where: { expenseId } }),
    prisma.expense.findUnique({ where: { id: expenseId } }),
  ]);
  if (!expense) return;

  const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const isPaidInFull = amountPaid > 0 && expense.actualAmount > 0 && amountPaid >= expense.actualAmount;
  const paymentStatus = amountPaid <= 0 ? "pending" : isPaidInFull ? "paid" : "partially_paid";
  const lastPaymentDate = payments.reduce<Date | null>(
    (latest, p) => (p.date && (!latest || p.date > latest) ? p.date : latest),
    null
  );

  await prisma.expense.update({
    where: { id: expenseId },
    data: { amountPaid, paymentStatus, paidDate: isPaidInFull ? (lastPaymentDate ?? new Date()) : null },
  });
}
