"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { deleteWeddingEvent } from "@/app/(app)/linea-tiempo/events-actions";
import { EventFormDialog } from "@/app/(app)/linea-tiempo/EventFormDialog";
import { SeatingEditorLoader } from "@/app/(app)/distribucion/SeatingEditorLoader";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Background } from "@/app/(app)/distribucion/canvasStore";
import type { RoomPoint } from "@/lib/seatGeometry";
import type { LayoutElement, WeddingEvent } from "@/generated/prisma";

type LayoutData = {
  elements: LayoutElement[];
  canvasWidth: number;
  canvasHeight: number;
  background: Background;
  roomShape: RoomPoint[];
};

export function DistribucionEventTabsClient({
  events,
  layoutByEvent,
}: {
  events: WeddingEvent[];
  layoutByEvent: Record<string, LayoutData>;
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
  const activeLayout = layoutByEvent[activeEvent.id] ?? {
    elements: [],
    canvasWidth: 2000,
    canvasHeight: 1400,
    background: "indoor" as Background,
    roomShape: [],
  };

  return (
    <Tabs value={activeEvent.id} onValueChange={(v) => v && setActiveId(v)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
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
                Crear evento
              </>
            }
            onCreated={setActiveId}
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
            description="Se eliminarán también su línea de tiempo y su distribución del salón. Esta acción no se puede deshacer."
            onConfirm={async () => {
              await deleteWeddingEvent(activeEvent.id);
              const remaining = events.filter((e) => e.id !== activeEvent.id);
              setActiveId(remaining[0]?.id ?? "");
            }}
            successMessage="Evento eliminado"
          />
        </div>
      </div>

      <SeatingEditorLoader
        key={activeEvent.id}
        eventId={activeEvent.id}
        initialElements={activeLayout.elements}
        canvasWidth={activeLayout.canvasWidth}
        canvasHeight={activeLayout.canvasHeight}
        initialBackground={activeLayout.background}
        initialRoomShape={activeLayout.roomShape}
      />
    </Tabs>
  );
}
