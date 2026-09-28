import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { ExpenseList } from "@/app/(app)/gastos/ExpenseList";

export const dynamic = "force-dynamic";

export default async function GastosPage() {
  const weddingId = await getActiveWeddingId();
  const [wedding, expenses, categories] = await Promise.all([
    prisma.wedding.findUnique({ where: { id: weddingId } }),
    prisma.expense.findMany({ where: { weddingId }, orderBy: { createdAt: "desc" } }),
    prisma.expenseCategory.findMany({ where: { weddingId }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <ExpenseList expenses={expenses} categories={categories} currency={wedding?.currency ?? "HNL"} />
  );
}
