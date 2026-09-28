import Link from "next/link";
import { HandCoins, Plus, Settings, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { getBudgetAlerts } from "@/lib/budgetAlerts";
import { CategoryCard } from "@/app/(app)/presupuesto/CategoryCard";
import { BudgetSummary } from "@/app/(app)/presupuesto/BudgetSummary";
import { ContributionCard } from "@/app/(app)/presupuesto/ContributionCard";
import { ContributionFormDialog } from "@/app/(app)/presupuesto/ContributionFormDialog";
import { Button } from "@/components/ui/button";
import { effectiveBudget } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

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
  const totalActual = expenses.reduce((sum, e) => sum + e.actualAmount, 0);
  const totalPaid = expenses.reduce((sum, e) => sum + e.amountPaid, 0);
  // Presupuesto: la suma de los aportes o, si no hay, lo estimado en las categorías.
  const budget = effectiveBudget(
    contributions.reduce((sum, c) => sum + c.amount, 0),
    categories.map((c) => c.estimatedBudget)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Presupuesto"
        description={
          <>
            Aportes, categorías y montos planeados. Los gastos reales se registran en{" "}
            <Link href="/gastos" className="font-medium text-foreground underline-offset-2 hover:underline">
              Gastos
            </Link>
            .
          </>
        }
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/configuracion" />}>
            <Settings className="size-4" />
            Gestionar categorías
          </Button>
        }
      />

      <BudgetSummary
        totalBudget={budget.amount}
        budgetSource={budget.source}
        totalActual={totalActual}
        totalPaid={totalPaid}
        currency={currency}
        alerts={alerts}
        contributions={contributions}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
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
          <EmptyState
            icon={HandCoins}
            title="Todavía no hay aportes"
            description="Registra quién aporta a la boda y cuánto (la pareja, sus papás u otras personas). El presupuesto total es la suma de los aportes."
          />
        ) : (
          <div className="space-y-2">
            {contributions.map((contribution) => (
              <ContributionCard key={contribution.id} contribution={contribution} currency={currency} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-medium text-foreground">Categorías de gasto</h2>
        {categories.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Todavía no hay categorías"
            description="Divide el presupuesto en categorías (catering, fotografía, flores…) con un monto estimado."
            action={
              <Button variant="outline" nativeButton={false} render={<Link href="/configuracion" />}>
                Ir a Configuración
              </Button>
            }
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
      </section>
    </div>
  );
}
