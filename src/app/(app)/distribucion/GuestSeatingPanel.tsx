"use client";

import { useMemo, useState, type CSSProperties, type DragEvent } from "react";
import { Armchair, GripVertical, Search, UserMinus, X } from "lucide-react";
import { useCanvasStore } from "@/app/(app)/distribucion/canvasStore";
import { GUEST_DRAG_TYPE, UNSEAT_ZONE_ATTR, useGuestSeatingStore } from "@/app/(app)/distribucion/guestSeatingStore";
import { seatGuestAt, unseatGuestById } from "@/app/(app)/distribucion/seatGuestClient";
import { guestsByTable, tableName, useGuestColorSlot } from "@/app/(app)/distribucion/seatingView";
import { seatColorVar } from "@/app/(app)/distribucion/planPalette";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { guestInitials, matchesGuestSearch, partySize, SEAT_COLOR_SLOTS, seatColorSlot, type SeatingGuest } from "@/lib/guestSeating";
import { GUEST_SIDES, labelColor, SIDE_LABEL, type LabelOption } from "@/lib/guestLabels";
import { isTableType } from "@/lib/seatGeometry";
import { cn } from "@/lib/utils";

type SideFilter = "all" | "bride" | "groom" | "both" | "none";
type View = "unassigned" | "seated";

const chip =
  "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-border px-2 text-[11.5px] font-medium transition-colors hover:border-primary";
const chipOn = "border-foreground bg-foreground text-background hover:border-foreground";

/** Empieza el arrastre HTML de un invitado (al plano, o de vuelta al panel para quitarlo). */
function startGuestDrag(e: DragEvent, guest: SeatingGuest) {
  e.dataTransfer.setData(GUEST_DRAG_TYPE, guest.id);
  e.dataTransfer.setData("text/plain", guest.fullName);
  e.dataTransfer.effectAllowed = "move";
  useGuestSeatingStore.getState().setDraggingGuest(guest.id);
}

function endGuestDrag() {
  const store = useGuestSeatingStore.getState();
  store.setDraggingGuest(null);
  store.setDropTarget(null);
}

/** Círculo con iniciales en el color del lado/grupo del invitado. */
export function GuestAvatar({ guest, slot, className }: { guest: SeatingGuest; slot: number | null; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full text-[10.5px] font-semibold text-(--plan-on-seat) shadow-[inset_0_0_0_2px_rgb(255_255_255/0.35)]",
        className
      )}
      style={{ background: seatColorVar(slot) }}
      aria-hidden
    >
      {guestInitials(guest.fullName)}
    </span>
  );
}

/** Segunda línea de un invitado: lado y grupo. */
export function guestSubtitle(guest: SeatingGuest) {
  return [guest.side ? SIDE_LABEL[guest.side] : "", guest.group].filter(Boolean).join(" · ") || "Sin lado ni grupo";
}

/**
 * Panel "Sin asignar": cuántas personas ya tienen silla, búsqueda y filtros, y la lista de
 * invitados para arrastrar al plano (o sentar con el menú "Sentar", sin arrastrar).
 */
export function GuestSeatingPanel({
  canEdit,
  otherTableIds,
  labels,
  className,
  style,
}: {
  canEdit: boolean;
  /** Mesas de los otros eventos: quien está ahí no aparece como "sin asignar". */
  otherTableIds: string[];
  labels: LabelOption[];
  className?: string;
  style?: CSSProperties;
}) {
  const guests = useGuestSeatingStore((s) => s.guests);
  const colorMode = useGuestSeatingStore((s) => s.colorMode);
  const setColorMode = useGuestSeatingStore((s) => s.setColorMode);
  const draggingGuestId = useGuestSeatingStore((s) => s.draggingGuestId);
  const elements = useCanvasStore((s) => s.elements);
  const slotOf = useGuestColorSlot();
  const [query, setQuery] = useState("");
  const [side, setSide] = useState<SideFilter>("all");
  const [labelId, setLabelId] = useState<string | null>(null);
  const [view, setView] = useState<View>("unassigned");

  const tables = useMemo(
    () => elements.filter((el) => isTableType(el.type)).sort((a, b) => (a.tableNumber ?? 0) - (b.tableNumber ?? 0)),
    [elements]
  );

  const summary = useMemo(() => {
    const here = new Set(tables.map((t) => t.id));
    const elsewhere = new Set(otherTableIds);
    let seated = 0;
    let total = 0;
    let otherEvent = 0;
    const bySlot = Array.from({ length: SEAT_COLOR_SLOTS + 1 }, () => 0);
    const unassigned: SeatingGuest[] = [];
    for (const guest of guests) {
      const size = partySize(guest);
      const isHere = !!guest.tableElementId && here.has(guest.tableElementId);
      if (guest.rsvpStatus === "declined" && !isHere) continue;
      total += size;
      if (isHere) {
        seated += size;
        bySlot[slotOf(guest) ?? SEAT_COLOR_SLOTS] += size;
      } else if (guest.tableElementId && elsewhere.has(guest.tableElementId)) {
        otherEvent += size;
      } else {
        unassigned.push(guest);
      }
    }
    return { seated, total, otherEvent, bySlot, unassigned, unassignedPeople: unassigned.reduce((n, g) => n + partySize(g), 0) };
  }, [guests, tables, otherTableIds, slotOf]);

  const seatedByTable = useMemo(() => guestsByTable(guests), [guests]);

  const passes = (guest: SeatingGuest) =>
    matchesGuestSearch(guest, query) &&
    (side === "all" || (side === "none" ? !guest.side : guest.side === side)) &&
    (!labelId || guest.labelIds.includes(labelId));

  const occupancy = (tableId: string) => (seatedByTable.get(tableId) ?? []).reduce((n, g) => n + partySize(g), 0);

  const draggingSeated = !!draggingGuestId && guests.some((g) => g.id === draggingGuestId && g.tableElementId);

  function guestRow(guest: SeatingGuest, seated: boolean) {
    const size = partySize(guest);
    return (
      <li
        key={guest.id}
        draggable={canEdit}
        onDragStart={(e) => startGuestDrag(e, guest)}
        onDragEnd={endGuestDrag}
        className={cn(
          "group flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/70",
          canEdit && "cursor-grab active:cursor-grabbing",
          draggingGuestId === guest.id && "bg-card opacity-60 shadow-md ring-1 ring-primary"
        )}
      >
        <GuestAvatar guest={guest} slot={slotOf(guest)} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[13px] font-medium text-foreground">{guest.fullName}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{guestSubtitle(guest)}</span>
        </span>
        {size > 1 && (
          <span className="shrink-0 rounded-md border border-border px-1.5 text-[10.5px] text-muted-foreground" title={`Viene con ${size - 1} acompañante${size > 2 ? "s" : ""}`}>
            +{size - 1}
          </span>
        )}
        {canEdit && seated && (
          <button
            type="button"
            className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-destructive"
            onClick={() => void unseatGuestById(guest.id)}
            title="Quitar de la mesa"
          >
            <X className="size-3.5" />
            <span className="sr-only">Quitar a {guest.fullName} de la mesa</span>
          </button>
        )}
        {canEdit && !seated && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="shrink-0 rounded-full border border-primary px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                />
              }
            >
              Sentar
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-72 w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{tables.length === 0 ? "Agrega una mesa al plano" : `Sentar a ${guest.fullName.split(" ")[0]} en…`}</DropdownMenuLabel>
                {tables.map((table) => {
                  const taken = occupancy(table.id);
                  const capacity = table.capacity ?? 0;
                  return (
                    <DropdownMenuItem
                      key={table.id}
                      disabled={taken + size > capacity}
                      onClick={() => void seatGuestAt(guest.id, table.id)}
                    >
                      <span className="flex-1 truncate">{tableName(table)}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {taken}/{capacity}
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {canEdit && <GripVertical className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />}
      </li>
    );
  }

  const unassigned = summary.unassigned.filter(passes);
  const seatedGroups = tables
    .map((table) => ({ table, guests: (seatedByTable.get(table.id) ?? []).filter(passes) }))
    .filter((group) => group.guests.length > 0);
  const percent = (n: number) => `${summary.total ? (n / summary.total) * 100 : 0}%`;

  return (
    <aside
      aria-label="Invitados por sentar"
      className={cn("flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground", className)}
      style={style}
    >
      <div className="grid gap-2 border-b border-border p-4 pb-3">
        <div className="flex items-baseline gap-1.5 tabular-nums">
          <b className="font-heading text-3xl leading-none font-semibold text-primary">{summary.seated}</b>
          <span className="text-[12.5px] text-muted-foreground">de {summary.total} sentados</span>
        </div>
        <div className="flex h-1.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${summary.seated} de ${summary.total} personas sentadas`}>
          {summary.bySlot.map((n, slot) =>
            n > 0 ? (
              <i key={slot} className="block h-full" style={{ width: percent(n), background: seatColorVar(slot === SEAT_COLOR_SLOTS ? null : slot) }} />
            ) : null
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11.5px]">
          {summary.unassignedPeople > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {summary.unassignedPeople} sin asignar
            </span>
          )}
          {summary.otherEvent > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground" title="Sentados en mesas de otro evento">
              {summary.otherEvent} en otro evento
            </span>
          )}
          <span className="ml-auto flex items-center gap-0.5 rounded-full bg-muted p-0.5" role="group" aria-label="Color de las sillas">
            {(["side", "group"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={colorMode === mode}
                onClick={() => setColorMode(mode)}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] text-muted-foreground",
                  colorMode === mode && "bg-card font-semibold text-foreground shadow-sm"
                )}
              >
                {mode === "side" ? "Por lado" : "Por grupo"}
              </button>
            ))}
          </span>
        </div>
      </div>

      <div className="grid gap-2 px-4 pt-3">
        <label className="relative block">
          <span className="sr-only">Buscar invitado</span>
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar invitado o grupo…" className="h-8 pl-8 text-sm" />
        </label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por lado">
          {(["all", ...GUEST_SIDES.map((s) => s.value), "none"] as SideFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={side === value}
              onClick={() => setSide(value)}
              className={cn(chip, side === value && chipOn)}
            >
              {value !== "all" && (
                <i
                  className="size-2 rounded-full"
                  style={{ background: seatColorVar(seatColorSlot({ side: value === "none" ? "" : value, group: "" }, "side", [])) }}
                />
              )}
              {value === "all" ? "Todos" : value === "none" ? "Sin lado" : GUEST_SIDES.find((s) => s.value === value)?.short}
            </button>
          ))}
        </div>
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por etiqueta">
            {labels.map((label) => (
              <button
                key={label.id}
                type="button"
                aria-pressed={labelId === label.id}
                onClick={() => setLabelId(labelId === label.id ? null : label.id)}
                className={cn(chip, labelId === label.id && chipOn)}
              >
                <i className="size-2 rounded-full" style={{ background: labelColor(label.color).dot }} />
                {label.name}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 rounded-lg bg-muted p-0.5 text-xs" role="tablist">
          {(["unassigned", "seated"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn("rounded-md py-1 font-medium text-muted-foreground", view === v && "bg-card text-foreground shadow-sm")}
            >
              {v === "unassigned" ? `Sin asignar · ${summary.unassigned.length}` : "Sentados"}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {view === "unassigned" ? (
          unassigned.length > 0 ? (
            <ul className="grid grid-cols-1 gap-0.5">{unassigned.map((g) => guestRow(g, false))}</ul>
          ) : (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {summary.unassigned.length === 0 ? "Todos tienen lugar." : "Nadie coincide con la búsqueda."}
            </p>
          )
        ) : seatedGroups.length > 0 ? (
          seatedGroups.map(({ table, guests: seated }) => (
            <section key={table.id} className="mb-2">
              <h4 className="flex items-center gap-1.5 px-2 pt-1 pb-0.5 text-[10.5px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                <Armchair className="size-3" />
                <span className="truncate">{tableName(table)}</span>
                <span className="ml-auto tracking-normal tabular-nums">
                  {occupancy(table.id)}/{table.capacity ?? 0}
                </span>
              </h4>
              <ul className="grid grid-cols-1 gap-0.5">{seated.map((g) => guestRow(g, true))}</ul>
            </section>
          ))
        ) : (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Todavía no hay nadie sentado en este salón.</p>
        )}
      </div>

      {canEdit && draggingSeated && <UnseatDropZone />}
      {canEdit && !draggingSeated && (
        <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          Arrastra a una mesa o a una silla. Toca una silla libre para elegir a quién sentar.
        </p>
      )}
    </aside>
  );
}

/**
 * Zona "Quitar de la mesa", visible solo mientras se arrastra a un invitado sentado. Solo esta
 * zona lo quita de su mesa (no todo el panel: soltarlo sin querer sobre la lista no debe
 * sacarlo). Acepta el arrastre HTML de una fila y el de una silla del plano (Konva), que la
 * busca por su atributo al soltar (ver SeatingEditor).
 */
function UnseatDropZone() {
  // Se monta con cada arrastre: el resaltado no queda pegado de un arrastre cancelado.
  const [htmlHover, setHtmlHover] = useState(false);
  const konvaHover = useGuestSeatingStore((s) => s.overUnseatZone);
  return (
    <div
      {...{ [UNSEAT_ZONE_ATTR]: "" }}
      className={cn(
        "m-2 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-4 text-xs font-medium text-muted-foreground transition-colors",
        (htmlHover || konvaHover) && "border-primary bg-primary/5 text-primary"
      )}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(GUEST_DRAG_TYPE)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setHtmlHover(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHtmlHover(false);
      }}
      onDrop={(e) => {
        const id = e.dataTransfer.getData(GUEST_DRAG_TYPE);
        if (!id) return;
        e.preventDefault();
        endGuestDrag();
        void unseatGuestById(id);
      }}
    >
      <UserMinus className="size-4" aria-hidden />
      Suelta aquí para quitarlo de la mesa
    </div>
  );
}
