"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, FileText, Landmark, Pencil, Trash2 } from "lucide-react";
import { deleteAccount } from "@/app/(app)/configuracion/accounts-actions";
import { AccountFormDialog } from "@/app/(app)/configuracion/AccountFormDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Account, ExpensePayment } from "@/generated/prisma";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es-HN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

function formatDate(date: Date | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("es-HN", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(date));
}

export function AccountCard({
  account,
  payments,
  expenseDescriptionById,
  currency,
}: {
  account: Account;
  payments: ExpensePayment[];
  expenseDescriptionById: Record<string, string>;
  currency: string;
}) {
  const [, startTransition] = useTransition();
  const [showPayments, setShowPayments] = useState(false);
  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Card size="sm">
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Landmark className="size-4" />
          </div>
          <div>
            <p className="font-medium text-foreground">{account.name}</p>
            <p className="text-xs text-muted-foreground">
              {account.notes && `${account.notes} · `}
              Pagado desde esta cuenta: <span className="text-foreground">{formatMoney(total, currency)}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setShowPayments((v) => !v)}>
            {showPayments ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            {payments.length > 0 ? `Pagos (${payments.length})` : "Pagos"}
          </Button>
          <AccountFormDialog
            account={account}
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
            title={`¿Eliminar la cuenta "${account.name}"?`}
            description="Los pagos que ya la usaban quedarán sin cuenta asignada. Esta acción no se puede deshacer."
            onConfirm={() => startTransition(() => deleteAccount(account.id))}
          />
        </div>
      </CardContent>

      {showPayments && (
        <div className="space-y-1.5 border-t border-border px-4 py-3">
          {payments.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todavía no hay pagos registrados desde esta cuenta.</p>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {formatMoney(payment.amount, currency)}
                    {formatDate(payment.date) && (
                      <span className="font-normal text-muted-foreground"> · {formatDate(payment.date)}</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {expenseDescriptionById[payment.expenseId] ?? "Gasto eliminado"}
                    {payment.notes && ` · ${payment.notes}`}
                  </p>
                </div>
                {payment.receiptUrl && (
                  <Button
                    variant="outline"
                    size="icon-sm"
                    render={<a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer" />}
                  >
                    <FileText className="size-3.5" />
                    <span className="sr-only">Ver comprobante</span>
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  );
}
