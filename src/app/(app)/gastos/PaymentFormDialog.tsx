"use client";

import { useRef, useState, useTransition, type ReactElement, type ReactNode } from "react";
import { toast } from "sonner";
import { useWeddingAccess } from "@/components/WeddingAccess";
import { createPayment, updatePayment } from "@/app/(app)/gastos/payments-actions";
import { Button } from "@/components/ui/button";
import { CatalogCombobox } from "@/components/CatalogCombobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileDropzone } from "@/components/ui/dropzone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Account, ExpensePayment } from "@/generated/prisma";

const NO_ACCOUNT = "none";

function toDateOnlyString(date: Date | null) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function PaymentFormDialog({
  expenseId,
  payment,
  accounts = [],
  triggerRender,
  triggerChildren,
}: {
  expenseId: string;
  payment?: ExpensePayment;
  accounts?: Account[];
  triggerRender: ReactElement;
  triggerChildren: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { canEdit } = useWeddingAccess();
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = Boolean(payment);

  // Los roles de solo lectura no ven controles de edición (el servidor también lo impide).
  if (!canEdit) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerRender}>{triggerChildren}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar pago" : "Agregar pago"}</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          id="payment-form"
          action={(formData) => {
            startTransition(async () => {
              try {
                if (payment) {
                  await updatePayment(payment.id, expenseId, formData);
                } else {
                  await createPayment(expenseId, formData);
                }
                formRef.current?.reset();
                setOpen(false);
                toast.success(payment ? "Pago actualizado" : "Pago registrado");
              } catch {
                toast.error("No se pudo guardar el cambio. Revisa los datos e inténtalo de nuevo.");
              }
            });
          }}
          className="space-y-3"
        >
          <div>
            <Label htmlFor="amount">Monto pagado</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min={0}
              defaultValue={payment?.amount ?? 0}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="date">Fecha del pago</Label>
            <DatePicker name="date" defaultValue={toDateOnlyString(payment?.date ?? null)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="accountId">Cuenta de origen</Label>
            <CatalogCombobox
              id="accountId"
              kind="account"
              valueBy="id"
              name="accountId"
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
              defaultValue={payment?.accountId ?? NO_ACCOUNT}
              emptyOption={{ value: NO_ACCOUNT, label: "Sin especificar" }}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="receipt">Comprobante</Label>
            <FileDropzone
              name="receipt"
              accept="image/*,.pdf"
              existingFileName={payment?.receiptName || undefined}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" defaultValue={payment?.notes} rows={2} className="mt-1" />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="payment-form" disabled={isPending}>
            {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Agregar pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
