"use client";

import { Pencil, Tag, Trash2 } from "lucide-react";
import { deleteCategory } from "@/app/(app)/presupuesto/actions";
import { CategoryFormDialog } from "@/app/(app)/presupuesto/CategoryFormDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Expense, ExpenseCategory } from "@/generated/prisma";
import { formatMoney } from "@/lib/format";

export function CategoryCard({
  category,
  expenses,
  currency,
}: {
  category: ExpenseCategory;
  expenses: Expense[];
  currency: string;
}) {
  const totalActual = expenses.reduce((sum, e) => sum + e.actualAmount, 0);
  const totalPaid = expenses.reduce((sum, e) => sum + e.amountPaid, 0);
  const overBudget = category.estimatedBudget > 0 && totalActual > category.estimatedBudget;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Tag className="size-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-heading text-base font-medium text-foreground">{category.name}</p>
              {overBudget && <Badge variant="destructive">Excedido</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              Estimado: {formatMoney(category.estimatedBudget, currency)} · Real: {formatMoney(totalActual, currency)} ·
              Pagado: {formatMoney(totalPaid, currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {expenses.length} {expenses.length === 1 ? "gasto registrado" : "gastos registrados"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">
          <CategoryFormDialog
            category={category}
            triggerRender={<Button variant="outline" size="icon-sm" />}
            triggerChildren={
              <>
                <Pencil className="size-3.5" />
                <span className="sr-only">Editar</span>
              </>
            }
          />
          <ConfirmDeleteDialog
            triggerRender={<Button variant="outline" size="icon-sm" />}
            triggerChildren={
              <>
                <Trash2 className="size-3.5 text-destructive" />
                <span className="sr-only">Eliminar</span>
              </>
            }
            title={`¿Eliminar la categoría "${category.name}"?`}
            description="Se eliminarán también todos los gastos registrados en esta categoría. Esta acción no se puede deshacer."
            onConfirm={() => deleteCategory(category.id)}
            successMessage="Categoría eliminada"
          />
        </div>
      </CardContent>
    </Card>
  );
}
