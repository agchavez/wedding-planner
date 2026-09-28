"use client";

import { useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuestCard } from "@/app/(app)/invitados/GuestCard";
import { GuestFormDialog } from "@/app/(app)/invitados/GuestFormDialog";
import type { Guest } from "@/generated/prisma";
import type { TableOption } from "@/lib/seatingLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "confirmed", label: "Confirmados" },
  { value: "declined", label: "Rechazados" },
] as const;

export function GuestList({ guests, tableOptions }: { guests: Guest[]; tableOptions: TableOption[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");

  const filtered = useMemo(
    () => (filter === "all" ? guests : guests.filter((g) => g.rsvpStatus === filter)),
    [guests, filter]
  );

  const totalAttending = useMemo(
    () =>
      guests
        .filter((g) => g.rsvpStatus === "confirmed")
        .reduce((sum, g) => sum + 1 + g.plusOnes, 0),
    [guests]
  );

  const groupSuggestions = useMemo(
    () => Array.from(new Set(guests.map((g) => g.group).filter(Boolean))).sort(),
    [guests]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invitados"
        description="Gestiona la lista de invitados, su confirmación y su mesa asignada."
        actions={
          <GuestFormDialog
            groupSuggestions={groupSuggestions}
            triggerRender={<Button />}
            triggerChildren={
              <>
                <Plus className="size-4" />
                Agregar invitado
              </>
            }
          />
        }
      />
      <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por confirmación">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-colors",
                filter === f.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              )}
            >
              {f.label}{" "}
              <span className="tabular-nums opacity-70">
                {f.value === "all" ? guests.length : guests.filter((g) => g.rsvpStatus === f.value).length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Confirmados (con acompañantes): <strong className="text-foreground">{totalAttending}</strong>
          </p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={guests.length === 0 ? "Todavía no hay invitados" : "Nadie en este filtro"}
          description={
            guests.length === 0
              ? "Agrega a tus invitados con su grupo y acompañantes; luego podrás asignarles mesa."
              : "Prueba con otro estado de confirmación."
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((guest) => (
            <GuestCard key={guest.id} guest={guest} tableOptions={tableOptions} groupSuggestions={groupSuggestions} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
