"use client";

import { useMemo, useState } from "react";
import { Search, UserMinus } from "lucide-react";
import { useCanvasStore } from "@/app/(app)/distribucion/canvasStore";
import { useGuestSeatingStore } from "@/app/(app)/distribucion/guestSeatingStore";
import { GuestAvatar, guestSubtitle } from "@/app/(app)/distribucion/GuestSeatingPanel";
import { seatGuestAt, unseatGuestById } from "@/app/(app)/distribucion/seatGuestClient";
import { guestsByTable, seatLabel, tableName, useGuestColorSlot } from "@/app/(app)/distribucion/seatingView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { matchesGuestSearch, partySize, resolveTableSeats, type SeatingGuest } from "@/lib/guestSeating";
import { isTableType } from "@/lib/seatGeometry";

const MAX_RESULTS = 60;

/**
 * Hoja "¿Quién va en la silla N?": se abre al tocar una silla (o con "Sentar aquí" sobre una
 * mesa). Busca entre los invitados sin mesa (y, al escribir, también entre los de otras mesas
 * para moverlos) y los sienta con un toque, sin arrastrar: es el flujo para el celular.
 */
export function SeatSheet({ canEdit, otherTableIds }: { canEdit: boolean; otherTableIds: string[] }) {
  const target = useGuestSeatingStore((s) => s.sheetTarget);
  const openSheet = useGuestSeatingStore((s) => s.openSheet);
  const guests = useGuestSeatingStore((s) => s.guests);
  const elements = useCanvasStore((s) => s.elements);
  const slotOf = useGuestColorSlot();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const table = target ? elements.find((el) => el.id === target.tableId && isTableType(el.type)) : undefined;
  const byTable = useMemo(() => guestsByTable(guests), [guests]);

  const seatedHere = table ? (byTable.get(table.id) ?? []) : [];
  const capacity = table?.capacity ?? 0;
  const occupied = seatedHere.reduce((n, g) => n + partySize(g), 0);
  const seatIndex = target?.seatIndex ?? null;
  const seat = table && seatIndex !== null ? (resolveTableSeats(capacity, seatedHere).seats[seatIndex] ?? null) : null;
  const occupant = seat ? seatedHere.find((g) => g.id === seat.guestId) : undefined;

  const tablesHere = new Map(elements.filter((el) => isTableType(el.type)).map((el) => [el.id, el]));
  const elsewhere = new Set(otherTableIds);
  const unassigned = guests.filter(
    (g) => g.rsvpStatus !== "declined" && !(g.tableElementId && (tablesHere.has(g.tableElementId) || elsewhere.has(g.tableElementId)))
  );
  // Con búsqueda, también los sentados en otras mesas de este salón (para cambiarlos de mesa).
  const movable = query.trim()
    ? guests.filter((g) => g.tableElementId && g.tableElementId !== table?.id && tablesHere.has(g.tableElementId))
    : [];
  const results = [...unassigned, ...movable].filter((g) => matchesGuestSearch(g, query)).slice(0, MAX_RESULTS);

  function close() {
    openSheet(null);
    setQuery("");
  }

  async function seatHere(guest: SeatingGuest) {
    if (!table) return;
    setBusy(true);
    const ok = await seatGuestAt(guest.id, table.id, seatIndex);
    setBusy(false);
    if (ok) close();
  }

  async function removeOccupant() {
    if (!occupant) return;
    setBusy(true);
    const ok = await unseatGuestById(occupant.id);
    setBusy(false);
    if (ok) close();
  }

  const title = !table
    ? "Mesa"
    : occupant
      ? `Silla ${(seatIndex ?? 0) + 1} · ${tableName(table)}`
      : seatIndex !== null
        ? `¿Quién va en la silla ${seatIndex + 1}?`
        : `Sentar en ${tableName(table)}`;

  return (
    <Sheet open={!!table} onOpenChange={(open) => !open && close()}>
      <SheetContent side="bottom" className="max-h-[80vh] gap-0 sm:mx-auto sm:max-w-lg sm:rounded-t-2xl">
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-border" aria-hidden />
        <SheetHeader className="pb-2">
          <SheetTitle className="font-heading text-lg font-semibold italic">{title}</SheetTitle>
          {table && (
            <SheetDescription className="tabular-nums">
              {tableName(table)} · {occupied}/{capacity} ocupadas · {unassigned.length} sin asignar
            </SheetDescription>
          )}
        </SheetHeader>

        {table && occupant && seat && (
          <div className="grid gap-3 px-4 pb-5">
            <div className="flex items-center gap-3 rounded-xl border border-border p-3">
              <GuestAvatar guest={occupant} slot={slotOf(occupant)} className="size-10 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {seat.companion === 0 ? occupant.fullName : `Acompañante de ${occupant.fullName}`}
                  {seat.companion > 0 && <span className="text-muted-foreground"> ({seatLabel(occupant, seat.companion)})</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {guestSubtitle(occupant)}
                  {partySize(occupant) > 1 && ` · grupo de ${partySize(occupant)}`}
                </p>
              </div>
            </div>
            {canEdit && (
              <Button variant="outline" onClick={() => void removeOccupant()} disabled={busy}>
                <UserMinus className="size-4" />
                Quitar de la mesa{partySize(occupant) > 1 ? " (con su grupo)" : ""}
              </Button>
            )}
            {canEdit && (
              <p className="text-xs text-muted-foreground">
                Para cambiarlo de mesa, arrastra su silla a otra mesa o búscalo desde una silla libre.
              </p>
            )}
          </div>
        )}

        {table && !occupant && !canEdit && <p className="px-4 pb-6 text-sm text-muted-foreground">Silla libre.</p>}

        {table && !occupant && canEdit && (
          <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-4">
            <label className="relative block">
              <span className="sr-only">Buscar invitado</span>
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o apellidos" className="h-10 pl-9" />
            </label>
            <ul className="-mx-2 min-h-0 flex-1 overflow-y-auto">
              {results.map((guest) => {
                const size = partySize(guest);
                const fits = occupied + size <= capacity;
                const from = guest.tableElementId ? tablesHere.get(guest.tableElementId) : undefined;
                return (
                  <li key={guest.id} className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/60">
                    <GuestAvatar guest={guest} slot={slotOf(guest)} />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-sm font-medium">{guest.fullName}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {from ? `En ${tableName(from)}` : guestSubtitle(guest)}
                        {size > 1 && ` · ${size} personas`}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant={fits ? "outline" : "ghost"}
                      className="shrink-0 rounded-full border-primary text-primary"
                      disabled={busy || !fits}
                      onClick={() => void seatHere(guest)}
                      title={fits ? undefined : `La mesa no tiene ${size} sillas libres`}
                    >
                      {!fits ? "No cabe" : from ? "Mover" : "Sentar"}
                    </Button>
                  </li>
                );
              })}
              {results.length === 0 && (
                <li className="px-2 py-6 text-center text-sm text-muted-foreground">
                  {unassigned.length === 0 && !query ? "Todos los invitados ya tienen mesa." : "Nadie coincide con la búsqueda."}
                </li>
              )}
            </ul>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
