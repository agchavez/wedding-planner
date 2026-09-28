"use client";

import { useRef, useState, useTransition, type ReactElement, type ReactNode } from "react";
import { toast } from "sonner";
import { useWeddingAccess } from "@/components/WeddingAccess";
import { createVendor, updateVendor } from "@/app/(app)/configuracion/vendors-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Vendor } from "@/generated/prisma";

export function VendorFormDialog({
  vendor,
  triggerRender,
  triggerChildren,
}: {
  vendor?: Vendor;
  triggerRender: ReactElement;
  triggerChildren: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { canEdit } = useWeddingAccess();
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = Boolean(vendor);

  // Los roles de solo lectura no ven controles de edición (el servidor también lo impide).
  if (!canEdit) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerRender}>{triggerChildren}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          id="vendor-form"
          action={(formData) => {
            startTransition(async () => {
              try {
                if (vendor) {
                  await updateVendor(vendor.id, formData);
                } else {
                  await createVendor(formData);
                }
                formRef.current?.reset();
                setOpen(false);
                toast.success(vendor ? "Proveedor actualizado" : "Proveedor agregado");
              } catch {
                toast.error("No se pudo guardar el cambio. Revisa los datos e inténtalo de nuevo.");
              }
            });
          }}
          className="space-y-3"
        >
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" defaultValue={vendor?.name} placeholder="Ej. Fotografía Luz" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="contactName">Persona de contacto</Label>
            <Input id="contactName" name="contactName" defaultValue={vendor?.contactName} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" name="phone" defaultValue={vendor?.phone} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" defaultValue={vendor?.notes} rows={2} className="mt-1" />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="vendor-form" disabled={isPending}>
            {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Agregar proveedor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
