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
import { LabelPicker } from "@/app/(app)/invitados/LabelPicker";
import { GUEST_SIDES, SIDE_LABEL, type LabelOption } from "@/lib/guestLabels";
import type { Guest } from "@/generated/prisma";

export function GuestFormDialog({
  guest,
  groupSuggestions = [],
  labels = [],
  defaultSide = "",
  triggerRender,
  triggerChildren,
}: {
  guest?: Guest;
  groupSuggestions?: string[];
  labels?: LabelOption[];
  /** Lado preseleccionado al agregar (p. ej. con el filtro "Novia" activo). */
  defaultSide?: string;
  triggerRender: ReactElement;
  triggerChildren: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [labelIds, setLabelIds] = useState<string[]>(guest?.labelIds ?? []);
  const [createdLabels, setCreatedLabels] = useState<LabelOption[]>([]);
  const { canEdit } = useWeddingAccess();
  const isEdit = Boolean(guest);

  // Los roles de solo lectura no ven controles de edición (el servidor también lo impide).
  if (!canEdit) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setLabelIds(guest?.labelIds ?? []);
        setOpen(next);
      }}
    >
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
                setLabelIds([]);
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
            <Label htmlFor="side">Invitado de</Label>
            <Select name="side" defaultValue={guest?.side || defaultSide || "none"}>
              <SelectTrigger id="side" className="mt-1 w-full">
                <SelectValue>{(value: string) => SIDE_LABEL[value] ?? "Sin definir"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin definir</SelectItem>
                {GUEST_SIDES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.short}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="phone">WhatsApp</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={guest?.phone}
              placeholder="9999-9999 o +1 305…"
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Etiquetas</Label>
            <div className="mt-1.5">
              <LabelPicker
                name="labelIds"
                labels={[...labels, ...createdLabels.filter((c) => !labels.some((l) => l.id === c.id))]}
                value={labelIds}
                onChange={setLabelIds}
                onLabelCreated={(label) => setCreatedLabels((prev) => [...prev, label])}
              />
            </div>
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
