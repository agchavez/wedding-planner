import { Card, CardContent } from "@/components/ui/card";
import { AlertBanner } from "@/components/AlertBanner";
import type { BudgetAlert } from "@/lib/budgetAlerts";
import type { BudgetContribution } from "@/generated/prisma";
import { formatMoney } from "@/lib/format";

export function BudgetSummary({
  totalBudget,
  budgetSource,
  totalActual,
  totalPaid,
  currency,
  alerts,
  contributions,
}: {
  totalBudget: number;
  budgetSource: "total" | "categories" | "none";
  totalActual: number;
  totalPaid: number;
  currency: string;
  alerts: BudgetAlert[];
  contributions: BudgetContribution[];
}) {
  const remaining = totalBudget - totalActual;
  const hasContributions = contributions.length > 0;

  return (
    <div className="space-y-3">
      <AlertBanner alerts={alerts} />
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Presupuesto total</p>
            <p className="font-heading text-2xl font-semibold text-foreground">{formatMoney(totalBudget, currency)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {budgetSource === "total"
                ? "Suma de los aportes"
                : budgetSource === "categories"
                  ? "Suma de lo estimado por categoría (sin aportes aún)"
                  : "Registra aportes o agrega categorías"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Gasto real</p>
            <p
              className={`font-heading text-2xl font-semibold ${
                totalActual > totalBudget && totalBudget > 0 ? "text-destructive" : "text-foreground"
              }`}
            >
              {formatMoney(totalActual, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pagado</p>
            <p className="font-heading text-2xl font-semibold text-foreground">{formatMoney(totalPaid, currency)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {hasContributions ? (remaining >= 0 ? "Sobra" : "Falta") : "Restante"}
            </p>
            <p
              className={`font-heading text-2xl font-semibold ${
                !hasContributions
                  ? "text-foreground"
                  : remaining >= 0
                    ? "text-emerald-600"
                    : "text-destructive"
              }`}
            >
              {formatMoney(Math.abs(remaining), currency)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
