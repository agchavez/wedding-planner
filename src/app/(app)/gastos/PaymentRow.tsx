"use client";

import { FileText, Pencil, Trash2 } from "lucide-react";
import { deletePayment } from "@/app/(app)/gastos/payments-actions";
import { PaymentFormDialog } from "@/app/(app)/gastos/PaymentFormDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import type { Account, ExpensePayment } from "@/generated/prisma";
import { formatCalendarDate, formatMoney } from "@/lib/format";

export function PaymentRow({
  expenseId,
  payment,
  currency,
  accounts = [],
}: {
  expenseId: string;
  payment: ExpensePayment;
  currency: string;
  accounts?: Account[];
}) {
  const date = payment.date ? formatCalendarDate(payment.date) : null;
  const accountName = payment.accountId ? accounts.find((a) => a.id === payment.accountId)?.name : null;

  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-foreground">
          {formatMoney(payment.amount, currency)}
          {date && <span className="font-normal text-muted-foreground"> · {date}</span>}
          {accountName && <span className="font-normal text-muted-foreground"> · {accountName}</span>}
        </p>
        {payment.notes && <p className="truncate text-xs text-muted-foreground">{payment.notes}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {payment.receiptUrl && (
          <Button variant="outline" size="icon-sm" render={<a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer" />}>
            <FileText className="size-3.5" />
            <span className="sr-only">Ver comprobante</span>
          </Button>
        )}
        <PaymentFormDialog
          expenseId={expenseId}
          payment={payment}
          accounts={accounts}
          triggerRender={<Button variant="outline" size="icon-sm" />}
          triggerChildren={
            <>
              <Pencil className="size-3.5" />
              <span className="sr-only">Editar pago</span>
            </>
          }
        />
        <ConfirmDeleteDialog
          triggerRender={<Button variant="outline" size="icon-sm" />}
          triggerChildren={
            <>
              <Trash2 className="size-3.5 text-destructive" />
              <span className="sr-only">Eliminar pago</span>
            </>
          }
          title="¿Eliminar este pago?"
          description="Esta acción no se puede deshacer."
          onConfirm={() => deletePayment(payment.id, expenseId)}
            successMessage="Pago eliminado"
        />
      </div>
    </div>
  );
}
