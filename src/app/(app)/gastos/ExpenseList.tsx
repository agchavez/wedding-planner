"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExpenseCard } from "@/app/(app)/gastos/ExpenseCard";
import { ExpenseFormDialog } from "@/app/(app)/gastos/ExpenseFormDialog";
import type { Account, Expense, ExpenseCategory, ExpensePayment } from "@/generated/prisma";

const ALL_CATEGORIES = "all";

export function ExpenseList({
  expenses,
  categories,
  currency,
  vendorNames = [],
  paymentsByExpense,
  accounts,
}: {
  expenses: Expense[];
  categories: ExpenseCategory[];
  currency: string;
  vendorNames?: string[];
  paymentsByExpense: Record<string, ExpensePayment[]>;
  accounts: Account[];
}) {
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);

  const categoryNameById = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const vendorSuggestions = useMemo(
    () => Array.from(new Set([...vendorNames, ...expenses.map((e) => e.vendor)].filter(Boolean))).sort(),
    [expenses, vendorNames]
  );

  const filtered = useMemo(
    () => (categoryFilter === ALL_CATEGORIES ? expenses : expenses.filter((e) => e.categoryId === categoryFilter)),
    [expenses, categoryFilter]
  );

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Primero crea al menos una categoría en Configuración para poder registrar gastos.
      </p>
    );
  }

  return (
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

        <ExpenseFormDialog
          categories={categories}
          defaultCategoryId={categoryFilter !== ALL_CATEGORIES ? categoryFilter : undefined}
          vendorSuggestions={vendorSuggestions}
          triggerRender={<Button size="sm" />}
          triggerChildren={
            <>
              <Plus className="size-3.5" />
              Agregar gasto
            </>
          }
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No hay gastos registrados todavía.</p>
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
              payments={paymentsByExpense[expense.id] ?? []}
              accounts={accounts}
            />
          ))}
        </div>
      )}
    </div>
  );
}
