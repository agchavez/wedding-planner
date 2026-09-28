import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { dateOnlyStr, todayStrWeddingTz } from "@/lib/dates";
import { effectiveBudget, formatCalendarDate, formatMoney } from "@/lib/format";

export type BudgetAlert = {
  type: "category_exceeded" | "total_exceeded" | "payment_overdue" | "payment_upcoming";
  message: string;
};

const UPCOMING_DAYS = 7;

export async function getBudgetAlerts(): Promise<BudgetAlert[]> {
  const weddingId = await getActiveWeddingId();
  const [wedding, categories, expenses, contributions] = await Promise.all([
    prisma.wedding.findUnique({ where: { id: weddingId } }),
    prisma.expenseCategory.findMany({ where: { weddingId } }),
    prisma.expense.findMany({ where: { weddingId } }),
    prisma.budgetContribution.findMany({ where: { weddingId } }),
  ]);

  const alerts: BudgetAlert[] = [];

  const totalBudget = contributions.reduce((sum, c) => sum + c.amount, 0);
  const totalActual = expenses.reduce((sum, e) => sum + e.actualAmount, 0);
  // Presupuesto: la suma de los aportes o, si no hay, lo estimado en las categorías.
  const budget = effectiveBudget(totalBudget, categories.map((c) => c.estimatedBudget));
  if (budget.amount > 0 && totalActual > budget.amount) {
    alerts.push({
      type: "total_exceeded",
      message: `El presupuesto total fue superado: ${formatMoney(totalActual, wedding?.currency)} de ${formatMoney(budget.amount, wedding?.currency)}.`,
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

  const todayStr = todayStrWeddingTz();
  const upcomingLimitStr = dateOnlyStr(new Date(Date.now() + UPCOMING_DAYS * 24 * 60 * 60 * 1000));
  for (const expense of expenses) {
    if (expense.paymentStatus === "paid" || !expense.dueDate) continue;
    const dueDateStr = dateOnlyStr(expense.dueDate);
    if (dueDateStr < todayStr) {
      alerts.push({
        type: "payment_overdue",
        message: `Pago vencido: "${expense.description}" (venció el ${formatDate(expense.dueDate)}).`,
      });
    } else if (dueDateStr <= upcomingLimitStr) {
      alerts.push({
        type: "payment_upcoming",
        message: `Pago próximo: "${expense.description}" vence el ${formatDate(expense.dueDate)}.`,
      });
    }
  }

  return alerts;
}

function formatDate(date: Date) {
  return formatCalendarDate(date);
}
