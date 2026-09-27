"use client";

import { useRef, useState, useTransition, type ReactElement, type ReactNode } from "react";
import { createExpense, updateExpense } from "@/app/(app)/gastos/actions";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_LABEL } from "@/app/(app)/gastos/constants";
import type { Expense, ExpenseCategory } from "@/generated/prisma";

function toDateOnlyString(date: Date | null) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function ExpenseFormDialog({
  expense,
  categories,
  defaultCategoryId,
  vendorSuggestions = [],
  triggerRender,
  triggerChildren,
}: {
  expense?: Expense;
  categories: ExpenseCategory[];
  defaultCategoryId?: string;
  vendorSuggestions?: string[];
  triggerRender: ReactElement;
  triggerChildren: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = Boolean(expense);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerRender}>{triggerChildren}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar gasto" : "Agregar gasto"}</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          id="expense-form"
          action={(formData) => {
            startTransition(async () => {
              if (expense) {
                await updateExpense(expense.id, formData);
              } else {
                await createExpense(formData);
              }
              formRef.current?.reset();
              setOpen(false);
            });
          }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Input id="description" name="description" defaultValue={expense?.description} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="categoryId">Categoría</Label>
            <Select name="categoryId" defaultValue={expense?.categoryId ?? defaultCategoryId}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Selecciona una categoría">
                  {(value: string) => categories.find((c) => c.id === value)?.name ?? "Selecciona una categoría"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="vendor">Proveedor</Label>
            <Combobox
              name="vendor"
              defaultValue={expense?.vendor}
              suggestions={vendorSuggestions}
              placeholder="Nombre del proveedor"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="paymentStatus">Estado de pago</Label>
            <Select name="paymentStatus" defaultValue={expense?.paymentStatus ?? "pending"}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue>{(value: string) => STATUS_LABEL[value] ?? value}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="partially_paid">Pago parcial</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="dueDate">Fecha de vencimiento</Label>
            <DatePicker name="dueDate" defaultValue={toDateOnlyString(expense?.dueDate ?? null)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="estimatedAmount">Monto estimado</Label>
            <Input
              id="estimatedAmount"
              name="estimatedAmount"
              type="number"
              step="0.01"
              defaultValue={expense?.estimatedAmount ?? 0}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="actualAmount">Monto real</Label>
            <Input
              id="actualAmount"
              name="actualAmount"
              type="number"
              step="0.01"
              defaultValue={expense?.actualAmount ?? 0}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="amountPaid">Monto pagado</Label>
            <Input
              id="amountPaid"
              name="amountPaid"
              type="number"
              step="0.01"
              defaultValue={expense?.amountPaid ?? 0}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" defaultValue={expense?.notes} rows={2} className="mt-1" />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="expense-form" disabled={isPending}>
            {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Agregar gasto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
