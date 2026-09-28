"use client";

import { useRef, useState, useTransition, type ReactElement, type ReactNode } from "react";
import { toast } from "sonner";
import { useWeddingAccess } from "@/components/WeddingAccess";
import { createContribution, updateContribution } from "@/app/(app)/presupuesto/contributions-actions";
import { CONTRIBUTOR_OPTIONS, CONTRIBUTOR_LABEL } from "@/app/(app)/presupuesto/contributorOptions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { BudgetContribution } from "@/generated/prisma";

function toDateOnlyString(date: Date | null) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function ContributionFormDialog({
  contribution,
  triggerRender,
  triggerChildren,
}: {
  contribution?: BudgetContribution;
  triggerRender: ReactElement;
  triggerChildren: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { canEdit } = useWeddingAccess();
  const formRef = useRef<HTMLFormElement>(null);
  const [contributor, setContributor] = useState(contribution?.contributor ?? "groom");
  const isEdit = Boolean(contribution);

  // Los roles de solo lectura no ven controles de edición (el servidor también lo impide).
  if (!canEdit) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setContributor(contribution?.contributor ?? "groom");
      }}
    >
      <DialogTrigger render={triggerRender}>{triggerChildren}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar aporte" : "Agregar aporte"}</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          id="contribution-form"
          action={(formData) => {
            startTransition(async () => {
              try {
                if (contribution) {
                  await updateContribution(contribution.id, formData);
                } else {
                  await createContribution(formData);
                }
                formRef.current?.reset();
                setOpen(false);
                toast.success(contribution ? "Aporte actualizado" : "Aporte registrado");
              } catch {
                toast.error("No se pudo guardar el cambio. Revisa los datos e inténtalo de nuevo.");
              }
            });
          }}
          className="space-y-3"
        >
          <div>
            <Label htmlFor="contributor">Quién aporta</Label>
            <Select name="contributor" value={contributor} onValueChange={(v) => v && setContributor(v)}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue>{(value: string) => CONTRIBUTOR_LABEL[value] ?? value}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CONTRIBUTOR_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {contributor === "other" && (
            <div>
              <Label htmlFor="otherLabel">¿Quién es?</Label>
              <Input
                id="otherLabel"
                name="otherLabel"
                defaultValue={contribution?.otherLabel}
                placeholder="Ej. Suegra, tío Juan"
                className="mt-1"
              />
            </div>
          )}
          <div>
            <Label htmlFor="amount">Monto</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min={0}
              defaultValue={contribution?.amount ?? 0}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="date">Fecha del aporte</Label>
            <DatePicker name="date" defaultValue={toDateOnlyString(contribution?.date ?? null)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" defaultValue={contribution?.notes} rows={2} className="mt-1" />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="contribution-form" disabled={isPending}>
            {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Agregar aporte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
