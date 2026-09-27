import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { getBudgetAlerts } from "@/lib/budgetAlerts";
import { CategoryFormDialog } from "@/app/(app)/presupuesto/CategoryFormDialog";
import { CategoryCard } from "@/app/(app)/presupuesto/CategoryCard";
import { BudgetSummary } from "@/app/(app)/presupuesto/BudgetSummary";
import { Button } from "@/components/ui/button";
import { effectiveBudget } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PresupuestoPage() {
  const weddingId = await getActiveWeddingId();
  const [wedding, categories, expenses, alerts] = await Promise.all([
    prisma.wedding.findUnique({ where: { id: weddingId } }),
    prisma.expenseCategory.findMany({ where: { weddingId }, orderBy: { sortOrder: "asc" } }),
    prisma.expense.findMany({ where: { weddingId } }),
    getBudgetAlerts(),
  ]);

  const currency = wedding?.currency ?? "HNL";
  const totalActual = expenses.reduce((sum, e) => sum + e.actualAmount, 0);
  const totalPaid = expenses.reduce((sum, e) => sum + e.amountPaid, 0);
  const budget = effectiveBudget(
    wedding?.totalBudget ?? 0,
    categories.map((c) => c.estimatedBudget)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">Presupuesto</h1>
          <p className="text-sm text-muted-foreground">
            Categorías y montos planeados. Los gastos reales se registran en{" "}
            <span className="font-medium text-foreground">Gastos</span>.
          </p>
        </div>
        <CategoryFormDialog
          triggerRender={<Button />}
          triggerChildren={
            <>
              <Plus className="size-4" />
              Agregar categoría
            </>
          }
        />
      </div>

      <BudgetSummary
        totalBudget={budget.amount}
        budgetSource={budget.source}
        totalActual={totalActual}
        totalPaid={totalPaid}
        currency={currency}
        alerts={alerts}
      />

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay categorías de gasto. Agrega la primera arriba.</p>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              expenses={expenses.filter((e) => e.categoryId === category.id)}
              currency={currency}
            />
          ))}
        </div>
      )}
    </div>
  );
}
