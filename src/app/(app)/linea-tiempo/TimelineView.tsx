"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Printer, Trash2, Plus, CalendarClock } from "lucide-react";
import { deleteTimelineEvent, reorderTimelineEvents } from "@/app/(app)/linea-tiempo/actions";
import { TIMELINE_CATEGORY_COLOR, TIMELINE_CATEGORY_LABEL } from "@/app/(app)/linea-tiempo/categories";
import { TimelineFormDialog } from "@/app/(app)/linea-tiempo/TimelineFormDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TimelineEvent } from "@/generated/prisma";
import { useWeddingAccess } from "@/components/WeddingAccess";
import { EmptyState } from "@/components/EmptyState";

function formatTime(date: Date | null) {
  if (!date) return "Hora por definir";
  return new Intl.DateTimeFormat("es-HN", { timeStyle: "short" }).format(new Date(date));
}

/** Fila usada tanto en pantalla como en la lista que se imprime/exporta. */
function TimelineRow({ item, dragHandle }: { item: TimelineEvent; dragHandle?: React.ReactNode }) {

  return (
    <Card className="print:border-none print:shadow-none">
      <CardContent className="flex items-start gap-3">
        {dragHandle}
        <div className="w-20 shrink-0 pt-0.5 text-right">
          <p className="font-heading text-sm font-semibold text-primary">{formatTime(item.startTime)}</p>
          {item.durationMinutes > 0 && <p className="text-xs text-muted-foreground">{item.durationMinutes} min</p>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{item.title}</p>
            {item.category && (
              <Badge variant="outline" className={cn("border-transparent", TIMELINE_CATEGORY_COLOR[item.category])}>
                {TIMELINE_CATEGORY_LABEL[item.category]}
              </Badge>
            )}
          </div>
          {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
        </div>
        <div className="flex shrink-0 gap-2 print:hidden">
          <TimelineFormDialog
            eventId={item.eventId ?? ""}
            item={item}
            triggerRender={<Button variant="outline" size="icon-sm" />}
            triggerChildren={
              <>
                <Pencil className="size-3.5" />
                <span className="sr-only">Editar</span>
              </>
            }
          />
          <ConfirmDeleteDialog
            triggerRender={<Button variant="outline" size="icon-sm" />}
            triggerChildren={
              <>
                <Trash2 className="size-3.5 text-destructive" />
                <span className="sr-only">Eliminar</span>
              </>
            }
            title={`¿Eliminar "${item.title}"?`}
            description="Esta acción no se puede deshacer."
            onConfirm={() => deleteTimelineEvent(item.id)}
            successMessage="Momento eliminado"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SortableTimelineRow({ item }: { item: TimelineEvent }) {
  const { canEdit } = useWeddingAccess();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !canEdit,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style}>
      <TimelineRow
        item={item}
        dragHandle={
          canEdit && (
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground print:hidden"
            aria-label="Arrastrar para reordenar"
          >
            <GripVertical className="size-4" />
          </button>
          )
        }
      />
    </div>
  );
}

export function TimelineView({ eventId, items }: { eventId: string; items: TimelineEvent[] }) {
  const [ordered, setOrdered] = useState(items);
  const [prevItems, setPrevItems] = useState(items);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  if (items !== prevItems) {
    setPrevItems(items);
    setOrdered(items);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrdered((current) => {
      const oldIndex = current.findIndex((i) => i.id === active.id);
      const newIndex = current.findIndex((i) => i.id === over.id);
      const reordered = arrayMove(current, oldIndex, newIndex);
      reorderTimelineEvents(reordered.map((i) => i.id));
      return reordered;
    });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end gap-2 print:hidden">
        {ordered.length > 0 && (
          <Button variant="outline" nativeButton={false} render={<Link href={`/imprimir/linea-tiempo/${eventId}`} />}>
            <Printer className="size-4" />
            Imprimir
          </Button>
        )}
        <TimelineFormDialog
          eventId={eventId}
          triggerRender={<Button />}
          triggerChildren={
            <>
              <Plus className="size-4" />
              Agregar momento
            </>
          }
        />
      </div>

      {ordered.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Todavía no hay momentos"
          description="Agrega cada momento del día con su hora y duración: llegada, ceremonia, brindis, primer baile…"
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ordered.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {ordered.map((item) => (
                <SortableTimelineRow key={item.id} item={item} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
