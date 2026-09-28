import { Card, CardContent } from "@/components/ui/card";
import { AlertBanner } from "@/components/AlertBanner";
import type { BudgetAlert } from "@/lib/budgetAlerts";
import { formatMoney } from "@/lib/format";

export function BudgetSummary({
  totalBudget,
  budgetSource,
  totalActual,
  totalPaid,
  currency,
  alerts,
}: {
  totalBudget: number;
  budgetSource: "total" | "categories" | "none";
  totalActual: number;
  totalPaid: number;
  currency: string;
  alerts: BudgetAlert[];
}) {
  return (
    <div className="space-y-3">
      <AlertBanner alerts={alerts} />
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Presupuesto total</p>
            <p className="font-heading text-2xl font-semibold text-foreground">{formatMoney(totalBudget, currency)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {budgetSource === "total"
                ? "Definido en los datos de la boda"
                : budgetSource === "categories"
                  ? "Suma de lo estimado por categoría"
                  : "Agrega categorías o define el total en el panel"}
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
        </CardContent>
      </Card>
    </div>
  );
}
