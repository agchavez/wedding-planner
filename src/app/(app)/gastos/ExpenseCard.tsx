"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { deleteExpense } from "@/app/(app)/gastos/actions";
import { ExpenseFormDialog } from "@/app/(app)/gastos/ExpenseFormDialog";
import { PaymentFormDialog } from "@/app/(app)/gastos/PaymentFormDialog";
import { PaymentRow } from "@/app/(app)/gastos/PaymentRow";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { STATUS_LABEL } from "@/app/(app)/gastos/constants";
import type { Account, Expense, ExpenseCategory, ExpensePayment } from "@/generated/prisma";
import { formatCalendarDate } from "@/lib/format";

const STATUS_CLASSES: Record<string, string> = {
  pending: "",
  partially_paid: "border-transparent bg-amber-100 text-amber-800",
  paid: "border-transparent bg-emerald-100 text-emerald-800",
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es-HN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

export function ExpenseCard({
  expense,
  categoryName,
  categories,
  currency,
  vendorSuggestions,
  payments,
  accounts,
}: {
  expense: Expense;
  categoryName: string;
  categories: ExpenseCategory[];
  currency: string;
  vendorSuggestions: string[];
  payments: ExpensePayment[];
  accounts: Account[];
}) {
  const [, startTransition] = useTransition();
  const [showPayments, setShowPayments] = useState(false);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Receipt className="size-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{expense.description}</p>
              <Badge variant="secondary">{categoryName}</Badge>
              <Badge variant="outline" className={STATUS_CLASSES[expense.paymentStatus]}>
                {STATUS_LABEL[expense.paymentStatus]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {expense.vendor && `${expense.vendor} · `}
              Estimado {formatMoney(expense.estimatedAmount, currency)} · Real {formatMoney(expense.actualAmount, currency)} ·
              Pagado {formatMoney(expense.amountPaid, currency)}
            </p>
            {expense.dueDate && (
              <p className="text-xs text-muted-foreground">
                Vence: {formatCalendarDate(expense.dueDate)}
              </p>
            )}
            {expense.notes && <p className="mt-1 text-sm text-muted-foreground">{expense.notes}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">
          <Button variant="outline" size="sm" onClick={() => setShowPayments((v) => !v)}>
            {showPayments ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            {payments.length > 0 ? `Pagos (${payments.length})` : "Pagos"}
          </Button>
          <ExpenseFormDialog
            expense={expense}
            categories={categories}
            vendorSuggestions={vendorSuggestions}
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
            title={`¿Eliminar el gasto "${expense.description}"?`}
            description="Esta acción no se puede deshacer."
            onConfirm={() => startTransition(() => deleteExpense(expense.id))}
          />
        </div>
      </CardContent>

      {showPayments && (
        <div className="space-y-2 border-t border-border px-4 py-3">
          {payments.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todavía no hay pagos registrados para este gasto.</p>
          ) : (
            <div className="space-y-1.5">
              {payments.map((payment) => (
                <PaymentRow
                  key={payment.id}
                  expenseId={expense.id}
                  payment={payment}
                  currency={currency}
                  accounts={accounts}
                />
              ))}
            </div>
          )}
          <PaymentFormDialog
            expenseId={expense.id}
            accounts={accounts}
            triggerRender={<Button variant="outline" size="sm" />}
            triggerChildren={
              <>
                <Plus className="size-3.5" />
                Agregar pago
              </>
            }
          />
        </div>
      )}
    </Card>
  );
}
