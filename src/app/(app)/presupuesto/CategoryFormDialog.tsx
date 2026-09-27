"use client";

import { useRef, useState, useTransition, type ReactElement, type ReactNode } from "react";
import { createCategory, updateCategory } from "@/app/(app)/presupuesto/actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWeddingAccess } from "@/components/WeddingAccess";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ExpenseCategory } from "@/generated/prisma";

export function CategoryFormDialog({
  category,
  triggerRender,
  triggerChildren,
}: {
  category?: ExpenseCategory;
  triggerRender: ReactElement;
  triggerChildren: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const { canEdit } = useWeddingAccess();
  const isEdit = Boolean(category);

  // Los roles de solo lectura no ven controles de edición (el servidor también lo impide).
  if (!canEdit) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerRender}>{triggerChildren}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar categoría" : "Agregar categoría"}</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          id="category-form"
          action={(formData) => {
            startTransition(async () => {
              try {
                if (category) {
                  await updateCategory(category.id, formData);
                } else {
                  await createCategory(formData);
                }
                formRef.current?.reset();
                setOpen(false);
                toast.success(category ? "Categoría actualizada" : "Categoría creada");
              } catch {
                toast.error("No se pudo guardar el cambio. Revisa los datos e inténtalo de nuevo.");
              }
            });
          }}
          className="space-y-3"
        >
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" defaultValue={category?.name} placeholder="Ej. Catering" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="estimatedBudget">Presupuesto estimado</Label>
            <Input
              id="estimatedBudget"
              name="estimatedBudget"
              type="number"
              step="0.01"
              min={0}
              defaultValue={category?.estimatedBudget ?? 0}
              className="mt-1"
            />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="category-form" disabled={isPending}>
            {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Agregar categoría"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
