import { Plus, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { getBudgetAlerts } from "@/lib/budgetAlerts";
import { CategoryFormDialog } from "@/app/(app)/presupuesto/CategoryFormDialog";
import { CategoryCard } from "@/app/(app)/presupuesto/CategoryCard";
import { BudgetSummary } from "@/app/(app)/presupuesto/BudgetSummary";
import { Button } from "@/components/ui/button";
import { effectiveBudget } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";

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
      <PageHeader
        title="Presupuesto"
        description={
          <>
            Categorías y montos planeados. Los gastos reales se registran en{" "}
            <Link href="/gastos" className="font-medium text-foreground underline-offset-2 hover:underline">
              Gastos
            </Link>
            .
          </>
        }
        actions={
          <CategoryFormDialog
            triggerRender={<Button />}
            triggerChildren={
              <>
                <Plus className="size-4" />
                Agregar categoría
              </>
            }
          />
        }
      />

      <BudgetSummary
        totalBudget={budget.amount}
        budgetSource={budget.source}
        totalActual={totalActual}
        totalPaid={totalPaid}
        currency={currency}
        alerts={alerts}
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Todavía no hay categorías"
          description="Divide el presupuesto en categorías (catering, fotografía, flores…) con un monto estimado."
        />
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
