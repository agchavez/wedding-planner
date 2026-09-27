"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { deleteWeddingEvent } from "@/app/(app)/linea-tiempo/events-actions";
import { EventFormDialog } from "@/app/(app)/linea-tiempo/EventFormDialog";
import { TimelineView } from "@/app/(app)/linea-tiempo/TimelineView";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TimelineEvent, WeddingEvent } from "@/generated/prisma";

export function EventTabsClient({
  events,
  itemsByEvent,
}: {
  events: WeddingEvent[];
  itemsByEvent: Record<string, TimelineEvent[]>;
}) {
  const [activeId, setActiveId] = useState(events[0]?.id ?? "");

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Todavía no tienes eventos. Crea uno para empezar (ej. &quot;Boda Jardín&quot;, &quot;Boda Fiesta&quot;).
        </p>
        <EventFormDialog
          triggerRender={<Button />}
          triggerChildren={
            <>
              <Plus className="size-4" />
              Crear evento
            </>
          }
          onCreated={setActiveId}
        />
      </div>
    );
  }

  const activeEvent = events.find((e) => e.id === activeId) ?? events[0];

  return (
    <Tabs value={activeEvent.id} onValueChange={(v) => v && setActiveId(v)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <TabsList>
          {events.map((event) => (
            <TabsTrigger key={event.id} value={event.id}>
              {event.name}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="flex items-center gap-2">
          <EventFormDialog
            triggerRender={<Button variant="outline" size="sm" />}
            triggerChildren={
              <>
                <Plus className="size-3.5" />
                Nuevo evento
              </>
            }
            onCreated={setActiveId}
          />
          <EventFormDialog
            event={activeEvent}
            triggerRender={<Button variant="outline" size="sm" />}
            triggerChildren="Renombrar"
          />
          <ConfirmDeleteDialog
            triggerRender={<Button variant="outline" size="icon-sm" />}
            triggerChildren={
              <>
                <Trash2 className="size-3.5 text-destructive" />
                <span className="sr-only">Eliminar evento</span>
              </>
            }
            title={`¿Eliminar el evento "${activeEvent.name}"?`}
            description="Se eliminarán también todos los momentos de su línea de tiempo. Esta acción no se puede deshacer."
            onConfirm={async () => {
              await deleteWeddingEvent(activeEvent.id);
              const remaining = events.filter((e) => e.id !== activeEvent.id);
              setActiveId(remaining[0]?.id ?? "");
            }}
            successMessage="Evento eliminado"
          />
        </div>
      </div>

      {events.map((event) => (
        <TabsContent key={event.id} value={event.id}>
          <TimelineView eventId={event.id} items={itemsByEvent[event.id] ?? []} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
