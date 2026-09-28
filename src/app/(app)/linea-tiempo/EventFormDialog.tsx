"use client";

import { useRef, useState, useTransition, type ReactElement, type ReactNode } from "react";
import { createWeddingEvent, updateWeddingEvent } from "@/app/(app)/linea-tiempo/events-actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWeddingAccess } from "@/components/WeddingAccess";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WeddingEvent } from "@/generated/prisma";

export function EventFormDialog({
  event,
  triggerRender,
  triggerChildren,
  onCreated,
}: {
  event?: WeddingEvent;
  triggerRender: ReactElement;
  triggerChildren: ReactNode;
  onCreated?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const { canEdit } = useWeddingAccess();
  const isEdit = Boolean(event);

  // Los roles de solo lectura no ven controles de edición (el servidor también lo impide).
  if (!canEdit) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerRender}>{triggerChildren}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Renombrar evento" : "Crear evento"}</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          id="event-form"
          action={(formData) => {
            startTransition(async () => {
              try {
                if (event) {
                  await updateWeddingEvent(event.id, formData);
                } else {
                  const id = await createWeddingEvent(formData);
                  onCreated?.(id);
                }
                formRef.current?.reset();
                setOpen(false);
                toast.success(event ? "Evento actualizado" : "Evento creado");
              } catch {
                toast.error("No se pudo guardar el cambio. Revisa los datos e inténtalo de nuevo.");
              }
            });
          }}
        >
          <Label htmlFor="name">Nombre del evento</Label>
          <Input
            id="name"
            name="name"
            defaultValue={event?.name}
            placeholder="Ej. Boda Jardín"
            required
            className="mt-1"
          />
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="event-form" disabled={isPending}>
            {isPending ? "Guardando…" : isEdit ? "Guardar" : "Crear evento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
