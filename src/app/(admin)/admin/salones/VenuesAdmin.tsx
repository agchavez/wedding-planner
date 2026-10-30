"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Globe2, Lock, Pencil, Search } from "lucide-react";
import {
  setRoomArchived,
  setVenueArchived,
  setVenueVisibility,
  updateVenue,
  updateVenueRoom,
  type ActionResult,
} from "@/app/(admin)/admin/salones/actions";
import { RoomPreview } from "@/app/(app)/distribucion/RoomPreview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDimensions } from "@/lib/layoutUnits";
import { cn } from "@/lib/utils";
import type { RoomVersionData, VenueVisibility } from "@/lib/venueLibrary";

export type AdminVenueRoom = {
  id: string;
  name: string;
  banquetCapacity: number | null;
  cocktailCapacity: number | null;
  theaterCapacity: number | null;
  archived: boolean;
  version: number;
  layer: RoomVersionData | null;
  sizeMeters: { width: number; height: number } | null;
  usedBy: number;
};

export type AdminVenue = {
  id: string;
  name: string;
  city: string;
  address: string;
  notes: string;
  visibility: VenueVisibility;
  archived: boolean;
  createdByName: string;
  weddingName: string | null;
  rooms: AdminVenueRoom[];
};

type Editing = { kind: "venue"; venue: AdminVenue } | { kind: "room"; room: AdminVenueRoom } | null;

export function VenuesAdmin({ venues }: { venues: AdminVenue[] }) {
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return venues.filter(
      (v) => (showArchived || !v.archived) && (!q || [v.name, v.city, v.createdByName].some((t) => t.toLowerCase().includes(q)))
    );
  }, [venues, query, showArchived]);

  function act(fn: () => Promise<ActionResult>, success: string) {
    startTransition(async () => {
      const result = await fn();
      if (result.error) toast.error(result.error);
      else {
        toast.success(success);
        setEditing(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar lugar, ciudad o autor" className="pl-8" />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-primary" />
          Mostrar archivados
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
          {venues.length === 0
            ? "Todavía no hay salones. Aparecerán aquí cuando alguien guarde uno desde el editor de distribución."
            : "Ningún lugar coincide con la búsqueda."}
        </p>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {visible.map((venue) => (
            <li key={venue.id} className={cn("rounded-2xl border border-border bg-card p-5", venue.archived && "opacity-60")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-heading text-xl font-semibold">{venue.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {[venue.city, venue.address].filter(Boolean).join(" · ") || "Sin dirección"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Guardado por {venue.createdByName || "—"}
                    {venue.weddingName && ` · boda ${venue.weddingName}`}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                    venue.archived
                      ? "bg-muted text-muted-foreground"
                      : venue.visibility === "platform"
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {venue.archived ? <Archive className="size-3.5" /> : venue.visibility === "platform" ? <Globe2 className="size-3.5" /> : <Lock className="size-3.5" />}
                  {venue.archived ? "Archivado" : venue.visibility === "platform" ? "Plataforma" : "Privado"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {!venue.archived && (
                  <Button
                    size="sm"
                    variant={venue.visibility === "platform" ? "outline" : "default"}
                    disabled={pending}
                    onClick={() =>
                      act(
                        () => setVenueVisibility(venue.id, venue.visibility === "platform" ? "private" : "platform"),
                        venue.visibility === "platform" ? "El lugar volvió a ser privado." : "Publicado para toda la plataforma."
                      )
                    }
                  >
                    {venue.visibility === "platform" ? <Lock className="size-3.5" /> : <Globe2 className="size-3.5" />}
                    {venue.visibility === "platform" ? "Hacer privado" : "Publicar en plataforma"}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setEditing({ kind: "venue", venue })}>
                  <Pencil className="size-3.5" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => act(() => setVenueArchived(venue.id, !venue.archived), venue.archived ? "Lugar restaurado." : "Lugar archivado.")}
                >
                  {venue.archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
                  {venue.archived ? "Restaurar" : "Archivar"}
                </Button>
              </div>

              <ul className="mt-4 space-y-3 border-t border-border pt-4">
                {venue.rooms.length === 0 && <li className="text-sm text-muted-foreground">Sin salones.</li>}
                {venue.rooms.map((room) => (
                  <li key={room.id} className={cn("flex gap-3", room.archived && "opacity-60")}>
                    <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-background p-1">
                      {room.layer && <RoomPreview layer={room.layer} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-medium">
                        <span className="truncate">{room.name}</span>
                        {room.archived && <span className="text-xs font-normal text-muted-foreground">(archivado)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        v{room.version}
                        {room.sizeMeters && ` · ${formatDimensions(room.sizeMeters.width, room.sizeMeters.height)}`}
                        {` · usado en ${room.usedBy} ${room.usedBy === 1 ? "plano" : "planos"}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Banquete {room.banquetCapacity ?? "—"} · Cóctel {room.cocktailCapacity ?? "—"} · Auditorio {room.theaterCapacity ?? "—"}
                      </p>
                      <div className="mt-1.5 flex gap-1.5">
                        <Button size="xs" variant="outline" onClick={() => setEditing({ kind: "room", room })}>
                          <Pencil className="size-3" />
                          Editar
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={pending}
                          onClick={() => act(() => setRoomArchived(room.id, !room.archived), room.archived ? "Salón restaurado." : "Salón archivado.")}
                        >
                          {room.archived ? "Restaurar" : "Archivar"}
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        {editing && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing.kind === "venue" ? "Editar lugar" : "Editar salón"}</DialogTitle>
            </DialogHeader>
            <form
              id="venue-edit-form"
              className="space-y-3"
              action={(formData) =>
                act(
                  () => (editing.kind === "venue" ? updateVenue(editing.venue.id, formData) : updateVenueRoom(editing.room.id, formData)),
                  "Cambios guardados."
                )
              }
            >
              {editing.kind === "venue" ? (
                <>
                  <Field name="name" label="Nombre" defaultValue={editing.venue.name} required />
                  <Field name="city" label="Ciudad" defaultValue={editing.venue.city} />
                  <Field name="address" label="Dirección" defaultValue={editing.venue.address} />
                  <div>
                    <Label htmlFor="notes">Notas</Label>
                    <Textarea id="notes" name="notes" defaultValue={editing.venue.notes} rows={3} className="mt-1" />
                  </div>
                </>
              ) : (
                <>
                  <Field name="name" label="Nombre del salón" defaultValue={editing.room.name} required />
                  <div className="grid grid-cols-3 gap-2">
                    <Field name="banquetCapacity" label="Banquete" type="number" defaultValue={editing.room.banquetCapacity ?? ""} />
                    <Field name="cocktailCapacity" label="Cóctel" type="number" defaultValue={editing.room.cocktailCapacity ?? ""} />
                    <Field name="theaterCapacity" label="Auditorio" type="number" defaultValue={editing.room.theaterCapacity ?? ""} />
                  </div>
                </>
              )}
            </form>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" form="venue-edit-form" disabled={pending}>
                {pending ? "Guardando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  defaultValue: string | number;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} required={required} min={type === "number" ? 1 : undefined} className="mt-1" />
    </div>
  );
}
