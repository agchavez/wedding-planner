import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";

export type BudgetAlert = {
  type: "category_exceeded" | "total_exceeded" | "payment_overdue" | "payment_upcoming";
  message: string;
};

const UPCOMING_DAYS = 7;

export async function getBudgetAlerts(): Promise<BudgetAlert[]> {
  const weddingId = await getActiveWeddingId();
  const [wedding, categories, expenses] = await Promise.all([
    prisma.wedding.findUnique({ where: { id: weddingId } }),
    prisma.expenseCategory.findMany({ where: { weddingId } }),
    prisma.expense.findMany({ where: { weddingId } }),
  ]);

  const alerts: BudgetAlert[] = [];

  const totalActual = expenses.reduce((sum, e) => sum + e.actualAmount, 0);
  if (wedding && wedding.totalBudget > 0 && totalActual > wedding.totalBudget) {
    alerts.push({
      type: "total_exceeded",
      message: `El presupuesto total fue superado: ${formatMoney(totalActual, wedding.currency)} de ${formatMoney(wedding.totalBudget, wedding.currency)}.`,
    });
  }

  for (const category of categories) {
    if (category.estimatedBudget <= 0) continue;
    const categoryTotal = expenses
      .filter((e) => e.categoryId === category.id)
      .reduce((sum, e) => sum + e.actualAmount, 0);
    if (categoryTotal > category.estimatedBudget) {
      alerts.push({
        type: "category_exceeded",
        message: `"${category.name}" superó su presupuesto: ${formatMoney(categoryTotal, wedding?.currency)} de ${formatMoney(category.estimatedBudget, wedding?.currency)}.`,
      });
    }
  }

  const now = new Date();
  const upcomingLimit = new Date(now.getTime() + UPCOMING_DAYS * 24 * 60 * 60 * 1000);
  for (const expense of expenses) {
    if (expense.paymentStatus === "paid" || !expense.dueDate) continue;
    if (expense.dueDate < now) {
      alerts.push({
        type: "payment_overdue",
        message: `Pago vencido: "${expense.description}" (venció el ${formatDate(expense.dueDate)}).`,
      });
    } else if (expense.dueDate <= upcomingLimit) {
      alerts.push({
        type: "payment_upcoming",
        message: `Pago próximo: "${expense.description}" vence el ${formatDate(expense.dueDate)}.`,
      });
    }
  }

  return alerts;
}

function formatMoney(amount: number, currency?: string) {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: currency || "HNL",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-HN", { dateStyle: "medium" }).format(date);
}
