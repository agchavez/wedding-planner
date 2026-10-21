"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Mail, Plus, Search, Tags, UserCheck, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GuestCard } from "@/app/(app)/invitados/GuestCard";
import { GuestFormDialog } from "@/app/(app)/invitados/GuestFormDialog";
import { LabelPicker } from "@/app/(app)/invitados/LabelPicker";
import { LabelDot } from "@/app/(app)/invitados/LabelChip";
import { bulkUpdateGuests } from "@/app/(app)/invitados/actions";
import { useWeddingAccess } from "@/components/WeddingAccess";
import type { Guest } from "@/generated/prisma";
import type { TableOption } from "@/lib/seatingLayout";
import { GUEST_SIDES, type LabelOption } from "@/lib/guestLabels";
import { nameKey } from "@/lib/catalog";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

const RSVP_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "confirmed", label: "Confirmados" },
  { value: "declined", label: "Rechazados" },
] as const;

const SIDE_TABS = [
  { value: "all", label: "Todos" },
  ...GUEST_SIDES.map((s) => ({ value: s.value, label: s.short })),
  { value: "none", label: "Sin lado" },
] as const;

type SideFilter = (typeof SIDE_TABS)[number]["value"];
type RsvpFilter = (typeof RSVP_FILTERS)[number]["value"];

function matchesSide(guest: Guest, side: SideFilter) {
  if (side === "all") return true;
  if (side === "none") return !guest.side;
  return guest.side === side;
}

function people(guests: Guest[]) {
  return guests.reduce((sum, g) => sum + 1 + g.plusOnes, 0);
}

function Stat({ label, value, hint, tone }: { label: string; value: number; hint?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 font-heading text-2xl font-semibold tabular-nums", tone)}>{value}</p>
      {hint && <p className="text-[0.7rem] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function GuestList({
  guests,
  tableOptions,
  groupNames = [],
  labels = [],
}: {
  guests: Guest[];
  tableOptions: TableOption[];
  groupNames?: string[];
  labels?: LabelOption[];
}) {
  const { canEdit } = useWeddingAccess();
  const [side, setSide] = useState<SideFilter>("all");
  const [rsvp, setRsvp] = useState<RsvpFilter>("all");
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const labelById = useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels]);

  // Lado y búsqueda primero: los contadores de confirmación respetan esos filtros.
  const bySideAndQuery = useMemo(() => {
    const q = nameKey(query);
    return guests.filter((g) => {
      if (!matchesSide(g, side)) return false;
      if (labelFilter.length > 0 && !labelFilter.every((id) => g.labelIds.includes(id))) return false;
      if (!q) return true;
      const haystack = nameKey([g.fullName, g.group, g.phone, ...g.plusOneNames, ...g.labelIds.map((id) => labelById.get(id)?.name ?? "")].join(" "));
      return haystack.includes(q);
    });
  }, [guests, side, labelFilter, query, labelById]);

  const filtered = useMemo(
    () => (rsvp === "all" ? bySideAndQuery : bySideAndQuery.filter((g) => g.rsvpStatus === rsvp)),
    [bySideAndQuery, rsvp]
  );

  const confirmed = bySideAndQuery.filter((g) => g.rsvpStatus === "confirmed");
  const pending = bySideAndQuery.filter((g) => g.rsvpStatus === "pending");
  const attendingPeople = confirmed.reduce((sum, g) => sum + (g.attendingCount ?? 1 + g.plusOnes), 0);

  const groupSuggestions = useMemo(
    () => Array.from(new Set([...groupNames, ...guests.map((g) => g.group)].filter(Boolean))).sort(),
    [guests, groupNames]
  );

  const filtersActive = side !== "all" || rsvp !== "all" || labelFilter.length > 0 || query !== "";
  const selectedIds = [...selected].filter((id) => filtered.some((g) => g.id === id));
  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runBulk(change: Parameters<typeof bulkUpdateGuests>[1], message: string) {
    startTransition(async () => {
      try {
        await bulkUpdateGuests(selectedIds, change);
        toast.success(message);
        setSelected(new Set());
      } catch {
        toast.error("No se pudo aplicar el cambio.");
      }
    });
  }

  function clearFilters() {
    setSide("all");
    setRsvp("all");
    setLabelFilter([]);
    setQuery("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invitados"
        description="Lista de invitados por lado, etiquetas, confirmación y mesa asignada."
        actions={
          <>
            <Button variant="outline" nativeButton={false} render={<Link href="/invitaciones" />}>
              <Mail className="size-4" />
              Enviar invitaciones
            </Button>
            <GuestFormDialog
              groupSuggestions={groupSuggestions}
              labels={labels}
              defaultSide={side === "all" || side === "none" ? "" : side}
              triggerRender={<Button />}
              triggerChildren={
                <>
                  <Plus className="size-4" />
                  Agregar invitado
                </>
              }
            />
          </>
        }
      />

      {/* Lado: novia / novio */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl bg-muted/60 p-1" role="tablist" aria-label="Filtrar por lado">
        {SIDE_TABS.map((t) => {
          const count = guests.filter((g) => matchesSide(g, t.value)).length;
          if (t.value === "none" && count === 0) return null;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={side === t.value}
              onClick={() => setSide(t.value)}
              className={cn(
                "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-all sm:flex-none sm:px-4",
                side === t.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              <span className="ml-1.5 text-xs tabular-nums opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Invitaciones" value={bySideAndQuery.length} hint={`${people(bySideAndQuery)} personas con acompañantes`} />
        <Stat label="Confirmados" value={confirmed.length} hint={`${attendingPeople} personas asistirán`} tone="text-emerald-700" />
        <Stat label="Pendientes" value={pending.length} hint={`${people(pending)} personas por confirmar`} tone="text-amber-700" />
        <Stat
          label="No asistirán"
          value={bySideAndQuery.length - confirmed.length - pending.length}
          tone="text-rose-700"
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, grupo, teléfono…"
                className="h-9 w-full rounded-lg border border-input bg-card pr-3 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 sm:h-8"
              />
            </div>
            {labels.length > 0 && (
              <LabelPicker
                labels={labels}
                value={labelFilter}
                onChange={setLabelFilter}
                allowCreate={false}
                placeholder="Filtrar por etiqueta"
              />
            )}
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="size-3.5" />
                Limpiar filtros
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por confirmación">
            {RSVP_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setRsvp(f.value)}
                aria-pressed={rsvp === f.value}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm transition-colors",
                  rsvp === f.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                )}
              >
                {f.label}{" "}
                <span className="tabular-nums opacity-70">
                  {f.value === "all" ? bySideAndQuery.length : bySideAndQuery.filter((g) => g.rsvpStatus === f.value).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {canEdit && filtered.length > 0 && (
          <div
            className={cn(
              "flex min-h-11 flex-wrap items-center gap-2 rounded-xl border px-3 py-1.5 transition-colors",
              selectedIds.length > 0 ? "border-primary/30 bg-secondary/60" : "border-transparent"
            )}
          >
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={allSelected}
                indeterminate={selectedIds.length > 0 && !allSelected}
                onCheckedChange={(checked) => setSelected(checked ? new Set(filtered.map((g) => g.id)) : new Set())}
              />
              {selectedIds.length > 0 ? (
                <span className="font-medium text-foreground">{selectedIds.length} seleccionados</span>
              ) : (
                "Seleccionar todos"
              )}
            </label>
            {selectedIds.length > 0 && (
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={isPending} />}>
                    <Users className="size-3.5" />
                    Lado
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {GUEST_SIDES.map((s) => (
                      <DropdownMenuItem key={s.value} onClick={() => runBulk({ side: s.value }, `Marcados como ${s.short.toLowerCase()}`)}>
                        {s.label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem onClick={() => runBulk({ side: "" }, "Lado quitado")}>Sin definir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {labels.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={isPending} />}>
                      <Tags className="size-3.5" />
                      Etiquetas
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-52">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>Agregar etiqueta</DropdownMenuLabel>
                        {labels.map((l) => (
                          <DropdownMenuItem key={l.id} onClick={() => runBulk({ addLabelId: l.id }, `Etiqueta "${l.name}" agregada`)}>
                            <LabelDot color={l.color} />
                            {l.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>Quitar etiqueta</DropdownMenuLabel>
                        {labels.map((l) => (
                          <DropdownMenuItem key={l.id} onClick={() => runBulk({ removeLabelId: l.id }, `Etiqueta "${l.name}" quitada`)}>
                            <LabelDot color={l.color} className="opacity-50" />
                            {l.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={isPending} />}>
                    <UserCheck className="size-3.5" />
                    Confirmación
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {RSVP_FILTERS.filter((f) => f.value !== "all").map((f) => (
                      <DropdownMenuItem key={f.value} onClick={() => runBulk({ rsvpStatus: f.value }, "Confirmación actualizada")}>
                        {f.label.replace(/s$/, "")}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon-sm" onClick={() => setSelected(new Set())} aria-label="Quitar selección">
                  <X className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={guests.length === 0 ? "Todavía no hay invitados" : "Nadie en este filtro"}
            description={
              guests.length === 0
                ? "Agrega a tus invitados con su lado, etiquetas y acompañantes; luego podrás asignarles mesa y enviarles su invitación."
                : "Prueba con otro lado, etiqueta o estado de confirmación."
            }
            action={
              filtersActive && guests.length > 0 ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((guest) => (
              <GuestCard
                key={guest.id}
                guest={guest}
                tableOptions={tableOptions}
                groupSuggestions={groupSuggestions}
                labels={labels}
                labelById={labelById}
                selectable={canEdit}
                selected={selected.has(guest.id)}
                onToggleSelect={() => toggleSelect(guest.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
