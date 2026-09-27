"use client";

import { useRef, useState, useTransition, type ReactElement, type ReactNode } from "react";
import { createWeddingEvent, updateWeddingEvent } from "@/app/(app)/linea-tiempo/events-actions";
import { Button } from "@/components/ui/button";
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
  const isEdit = Boolean(event);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerRender}>{triggerChildren}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Renombrar evento" : "Nuevo evento"}</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          id="event-form"
          action={(formData) => {
            startTransition(async () => {
              if (event) {
                await updateWeddingEvent(event.id, formData);
              } else {
                const id = await createWeddingEvent(formData);
                onCreated?.(id);
              }
              formRef.current?.reset();
              setOpen(false);
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
            {isPending ? "Guardando..." : isEdit ? "Guardar" : "Crear evento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
