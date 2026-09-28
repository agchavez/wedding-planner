"use client";

import { useRef, useState, useTransition, type ReactElement, type ReactNode } from "react";
import { createPayment, updatePayment } from "@/app/(app)/gastos/payments-actions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileDropzone } from "@/components/ui/dropzone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = Boolean(payment);

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
              if (payment) {
                await updatePayment(payment.id, expenseId, formData);
              } else {
                await createPayment(expenseId, formData);
              }
              formRef.current?.reset();
              setOpen(false);
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
            <Select name="accountId" defaultValue={payment?.accountId ?? NO_ACCOUNT}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue>
                  {(value: string) =>
                    value === NO_ACCOUNT ? "Sin especificar" : accounts.find((a) => a.id === value)?.name ?? value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ACCOUNT}>Sin especificar</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
