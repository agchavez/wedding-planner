"use client";

import { useMemo, useState } from "react";
import { Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExpenseCard } from "@/app/(app)/gastos/ExpenseCard";
import { ExpenseFormDialog } from "@/app/(app)/gastos/ExpenseFormDialog";
import type { Expense, ExpenseCategory } from "@/generated/prisma";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";

const ALL_CATEGORIES = "all";

export function ExpenseList({
  expenses,
  categories,
  currency,
}: {
  expenses: Expense[];
  categories: ExpenseCategory[];
  currency: string;
}) {
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);

  const categoryNameById = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const vendorSuggestions = useMemo(
    () => Array.from(new Set(expenses.map((e) => e.vendor).filter(Boolean))).sort(),
    [expenses]
  );

  const filtered = useMemo(
    () => (categoryFilter === ALL_CATEGORIES ? expenses : expenses.filter((e) => e.categoryId === categoryFilter)),
    [expenses, categoryFilter]
  );

  if (categories.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Gastos" description="Registro de todos los gastos, sin importar la categoría." />
        <EmptyState
          icon={Receipt}
          title="Primero crea una categoría"
          description="Cada gasto pertenece a una categoría del presupuesto (catering, música, flores…)."
          action={
            <Button nativeButton={false} render={<Link href="/presupuesto" />}>
              Ir a Presupuesto
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gastos"
        description="Registro de todos los gastos, sin importar la categoría."
        actions={
          <ExpenseFormDialog
            categories={categories}
            defaultCategoryId={categoryFilter !== ALL_CATEGORIES ? categoryFilter : undefined}
            vendorSuggestions={vendorSuggestions}
            triggerRender={<Button />}
            triggerChildren={
              <>
                <Plus className="size-4" />
                Agregar gasto
              </>
            }
          />
        }
      />
      <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value ?? ALL_CATEGORIES)}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue>
              {(value: string) =>
                value === ALL_CATEGORIES ? "Todas las categorías" : categories.find((c) => c.id === value)?.name ?? value
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>Todas las categorías</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={categoryFilter === ALL_CATEGORIES ? "Todavía no hay gastos" : "No hay gastos en esta categoría"}
          description="Registra cada pago o cotización con su proveedor y fecha de vencimiento."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              categoryName={categoryNameById.get(expense.categoryId) ?? "Sin categoría"}
              categories={categories}
              currency={currency}
              vendorSuggestions={vendorSuggestions}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
