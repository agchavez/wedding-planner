import Link from "next/link";
import { Plus, Settings } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { getBudgetAlerts } from "@/lib/budgetAlerts";
import { CategoryCard } from "@/app/(app)/presupuesto/CategoryCard";
import { BudgetSummary } from "@/app/(app)/presupuesto/BudgetSummary";
import { ContributionCard } from "@/app/(app)/presupuesto/ContributionCard";
import { ContributionFormDialog } from "@/app/(app)/presupuesto/ContributionFormDialog";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function PresupuestoPage() {
  const weddingId = await getActiveWeddingId();
  const [wedding, categories, expenses, contributions, alerts] = await Promise.all([
    prisma.wedding.findUnique({ where: { id: weddingId } }),
    prisma.expenseCategory.findMany({ where: { weddingId }, orderBy: { sortOrder: "asc" } }),
    prisma.expense.findMany({ where: { weddingId } }),
    prisma.budgetContribution.findMany({ where: { weddingId }, orderBy: { createdAt: "desc" } }),
    getBudgetAlerts(),
  ]);

  const currency = wedding?.currency ?? "HNL";
  const totalBudget = contributions.reduce((sum, c) => sum + c.amount, 0);
  const totalActual = expenses.reduce((sum, e) => sum + e.actualAmount, 0);
  const totalPaid = expenses.reduce((sum, e) => sum + e.amountPaid, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">Presupuesto</h1>
          <p className="text-sm text-muted-foreground">
            Aportes, categorías y montos planeados. Los gastos reales se registran en{" "}
            <span className="font-medium text-foreground">Gastos</span>.
          </p>
        </div>
        <Button variant="outline" render={<Link href="/configuracion" />}>
          <Settings className="size-4" />
          Gestionar categorías
        </Button>
      </div>

      <BudgetSummary
        totalBudget={totalBudget}
        totalActual={totalActual}
        totalPaid={totalPaid}
        currency={currency}
        alerts={alerts}
        contributions={contributions}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-medium text-foreground">Aportes</h2>
          <ContributionFormDialog
            triggerRender={<Button size="sm" />}
            triggerChildren={
              <>
                <Plus className="size-3.5" />
                Agregar aporte
              </>
            }
          />
        </div>
        {contributions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay aportes registrados. Agrega quién y cuánto dio arriba.
          </p>
        ) : (
          <div className="space-y-2">
            {contributions.map((contribution) => (
              <ContributionCard key={contribution.id} contribution={contribution} currency={currency} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="font-heading text-lg font-medium text-foreground">Categorías de gasto</h2>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay categorías de gasto. Créalas desde{" "}
            <Link href="/configuracion" className="font-medium text-foreground underline">
              Configuración
            </Link>
            .
          </p>
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
    </div>
  );
}
