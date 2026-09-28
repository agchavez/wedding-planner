"use client";

import { useRef, useState, useTransition, type ReactElement, type ReactNode } from "react";
import { createExpense, updateExpense } from "@/app/(app)/gastos/actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWeddingAccess } from "@/components/WeddingAccess";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Expense, ExpenseCategory } from "@/generated/prisma";
import { toDateOnlyValue } from "@/lib/format";

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
  const { canEdit } = useWeddingAccess();
  const isEdit = Boolean(expense);

  // Los roles de solo lectura no ven controles de edición (el servidor también lo impide).
  if (!canEdit) return null;

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
              try {
                if (expense) {
                  await updateExpense(expense.id, formData);
                } else {
                  await createExpense(formData);
                }
                formRef.current?.reset();
                setOpen(false);
                toast.success(expense ? "Gasto actualizado" : "Gasto registrado");
              } catch {
                toast.error("No se pudo guardar el cambio. Revisa los datos e inténtalo de nuevo.");
              }
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
            <Label htmlFor="dueDate">Fecha de vencimiento</Label>
            <DatePicker name="dueDate" defaultValue={toDateOnlyValue(expense?.dueDate)} className="mt-1" />
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
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" defaultValue={expense?.notes} rows={2} className="mt-1" />
          </div>
          {isEdit && (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              El monto pagado y el estado de pago se calculan según los pagos que registres para este gasto (con
              &quot;Ver pagos&quot; en la tarjeta).
            </p>
          )}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="expense-form" disabled={isPending}>
            {isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Agregar gasto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
