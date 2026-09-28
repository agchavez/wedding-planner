import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { ExpenseList } from "@/app/(app)/gastos/ExpenseList";
import type { ExpensePayment } from "@/generated/prisma";

export const dynamic = "force-dynamic";

export default async function GastosPage() {
  const weddingId = await getActiveWeddingId();
  const [wedding, expenses, categories, vendors, accounts] = await Promise.all([
    prisma.wedding.findUnique({ where: { id: weddingId } }),
    prisma.expense.findMany({ where: { weddingId }, orderBy: { createdAt: "desc" } }),
    prisma.expenseCategory.findMany({ where: { weddingId }, orderBy: { sortOrder: "asc" } }),
    prisma.vendor.findMany({ where: { weddingId }, orderBy: { name: "asc" } }),
    prisma.account.findMany({ where: { weddingId }, orderBy: { name: "asc" } }),
  ]);

  const payments = await prisma.expensePayment.findMany({
    where: { expenseId: { in: expenses.map((e) => e.id) } },
    orderBy: { date: "desc" },
  });
  const paymentsByExpense: Record<string, ExpensePayment[]> = {};
  for (const payment of payments) {
    (paymentsByExpense[payment.expenseId] ??= []).push(payment);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">Gastos</h1>
        <p className="text-sm text-muted-foreground">Registro de todos los gastos, sin importar la categoría.</p>
      </div>
      <ExpenseList
        expenses={expenses}
        categories={categories}
        currency={wedding?.currency ?? "HNL"}
        vendorNames={vendors.map((v) => v.name)}
        paymentsByExpense={paymentsByExpense}
        accounts={accounts}
      />
    </div>
  );
}
