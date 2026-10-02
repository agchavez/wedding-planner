"use client";

import { useRef, useState, useTransition, type ReactElement, type ReactNode } from "react";
import { toast } from "sonner";
import { CATALOG_NAME_MAX } from "@/lib/catalog";
import { useWeddingAccess } from "@/components/WeddingAccess";
import { createGroup, updateGroup } from "@/app/(app)/configuracion/groups-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GuestGroup } from "@/generated/prisma";

export function GroupFormDialog({
  group,
  triggerRender,
  triggerChildren,
}: {
  group?: GuestGroup;
  triggerRender: ReactElement;
  triggerChildren: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { canEdit } = useWeddingAccess();
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = Boolean(group);

  // Los roles de solo lectura no ven controles de edición (el servidor también lo impide).
  if (!canEdit) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerRender}>{triggerChildren}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar grupo" : "Nuevo grupo"}</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          id="group-form"
          action={(formData) => {
            startTransition(async () => {
              try {
                const result = group
                  ? await updateGroup(group.id, formData)
                  : await createGroup(formData);
                if (result?.error) {
                  toast.error(result.error);
                  return;
                }
                formRef.current?.reset();
                setOpen(false);
                toast.success(group ? "Grupo actualizado" : "Grupo creado");
              } catch {
                toast.error("No se pudo guardar el cambio. Revisa los datos e inténtalo de nuevo.");
              }
            });
          }}
          className="space-y-3"
        >
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              maxLength={CATALOG_NAME_MAX}
              defaultValue={group?.name}
              placeholder="Ej. Familia del novio"
              required
              className="mt-1"
            />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="group-form" disabled={isPending}>
            {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Agregar grupo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
