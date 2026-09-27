"use client";

import { useRef, useState, useTransition, type ReactElement, type ReactNode } from "react";
import { format } from "date-fns";
import { createTimelineEvent, updateTimelineEvent } from "@/app/(app)/linea-tiempo/actions";
import { TIMELINE_CATEGORY_LABEL, TIMELINE_CATEGORY_OPTIONS } from "@/app/(app)/linea-tiempo/categories";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWeddingAccess } from "@/components/WeddingAccess";
import { TimePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TimelineEvent } from "@/generated/prisma";

export function TimelineFormDialog({
  eventId,
  item,
  triggerRender,
  triggerChildren,
}: {
  eventId: string;
  item?: TimelineEvent;
  triggerRender: ReactElement;
  triggerChildren: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const { canEdit } = useWeddingAccess();
  const isEdit = Boolean(item);

  // Los roles de solo lectura no ven controles de edición (el servidor también lo impide).
  if (!canEdit) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerRender}>{triggerChildren}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar momento" : "Agregar momento"}</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          id="timeline-form"
          action={(formData) => {
            startTransition(async () => {
              try {
                if (item) {
                  await updateTimelineEvent(item.id, formData);
                } else {
                  await createTimelineEvent(eventId, formData);
                }
                formRef.current?.reset();
                setOpen(false);
                toast.success(item ? "Momento actualizado" : "Momento agregado");
              } catch {
                toast.error("No se pudo guardar el cambio. Revisa los datos e inténtalo de nuevo.");
              }
            });
          }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              name="title"
              defaultValue={item?.title}
              placeholder="Ej. Entrada triunfal"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="time">Hora aproximada</Label>
            <TimePicker
              name="time"
              defaultValue={item?.startTime ? format(new Date(item.startTime), "HH:mm") : undefined}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="durationMinutes">Duración (minutos)</Label>
            <Input
              id="durationMinutes"
              name="durationMinutes"
              type="number"
              min={0}
              defaultValue={item?.durationMinutes ?? 0}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="category">Categoría</Label>
            <Select name="category" defaultValue={item?.category ?? "none"}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue>{(value: string) => TIMELINE_CATEGORY_LABEL[value] ?? "Sin categoría"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin categoría</SelectItem>
                {TIMELINE_CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" defaultValue={item?.description} rows={2} className="mt-1" />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="timeline-form" disabled={isPending}>
            {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Agregar momento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
