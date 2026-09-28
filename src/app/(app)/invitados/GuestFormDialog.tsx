"use client";

import { useRef, useState, useTransition, type ReactElement, type ReactNode } from "react";
import { createGuest, updateGuest } from "@/app/(app)/invitados/actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWeddingAccess } from "@/components/WeddingAccess";
import { CatalogCombobox } from "@/components/CatalogCombobox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RSVP_LABEL } from "@/app/(app)/invitados/constants";
import type { Guest } from "@/generated/prisma";

export function GuestFormDialog({
  guest,
  groupSuggestions = [],
  triggerRender,
  triggerChildren,
}: {
  guest?: Guest;
  groupSuggestions?: string[];
  triggerRender: ReactElement;
  triggerChildren: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const { canEdit } = useWeddingAccess();
  const isEdit = Boolean(guest);

  // Los roles de solo lectura no ven controles de edición (el servidor también lo impide).
  if (!canEdit) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerRender}>{triggerChildren}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar invitado" : "Agregar invitado"}</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          id="guest-form"
          action={(formData) => {
            startTransition(async () => {
              try {
                if (guest) {
                  await updateGuest(guest.id, formData);
                } else {
                  await createGuest(formData);
                }
                formRef.current?.reset();
                setOpen(false);
                toast.success(guest ? "Invitado actualizado" : "Invitado agregado");
              } catch {
                toast.error("No se pudo guardar el cambio. Revisa los datos e inténtalo de nuevo.");
              }
            });
          }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <div>
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input id="fullName" name="fullName" defaultValue={guest?.fullName} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="group">Grupo</Label>
            <CatalogCombobox
              id="group"
              kind="group"
              valueBy="name"
              name="group"
              options={groupSuggestions.map((g) => ({ value: g, label: g }))}
              defaultValue={guest?.group}
              placeholder="Ej. Familia del novio"
              emptyOption={{ value: "", label: "Sin grupo" }}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="rsvpStatus">Confirmación</Label>
            <Select name="rsvpStatus" defaultValue={guest?.rsvpStatus ?? "pending"}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue>{(value: string) => RSVP_LABEL[value] ?? value}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="declined">Rechazado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="plusOnes">Acompañantes</Label>
            <Input
              id="plusOnes"
              name="plusOnes"
              type="number"
              min={0}
              defaultValue={guest?.plusOnes ?? 0}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="plusOneNames">Nombres de acompañantes</Label>
            <Input
              id="plusOneNames"
              name="plusOneNames"
              defaultValue={guest?.plusOneNames.join(", ")}
              placeholder="Separados por coma"
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="dietaryRestrictions">Restricciones alimentarias</Label>
            <Input
              id="dietaryRestrictions"
              name="dietaryRestrictions"
              defaultValue={guest?.dietaryRestrictions}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" defaultValue={guest?.notes} rows={2} className="mt-1" />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="guest-form" disabled={isPending}>
            {isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Agregar invitado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
