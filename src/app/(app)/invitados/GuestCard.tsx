"use client";

import { useTransition } from "react";
import { Pencil, Trash2, Users } from "lucide-react";
import { assignGuestTable, deleteGuest } from "@/app/(app)/invitados/actions";
import { GuestFormDialog } from "@/app/(app)/invitados/GuestFormDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RSVP_LABEL } from "@/app/(app)/invitados/constants";
import type { Guest } from "@/generated/prisma";
import type { TableOption } from "@/lib/seatingLayout";

const RSVP_CLASSES: Record<string, string> = {
  pending: "",
  confirmed: "border-transparent bg-emerald-100 text-emerald-800",
  declined: "border-transparent bg-destructive/10 text-destructive",
};

const NO_TABLE = "none";

export function GuestCard({
  guest,
  tableOptions,
  groupSuggestions,
}: {
  guest: Guest;
  tableOptions: TableOption[];
  groupSuggestions: string[];
}) {
  const [, startTransition] = useTransition();

  function handleTableChange(value: string | null) {
    startTransition(() => assignGuestTable(guest.id, !value || value === NO_TABLE ? null : value));
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Users className="size-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{guest.fullName}</p>
              <Badge variant="outline" className={RSVP_CLASSES[guest.rsvpStatus]}>
                {RSVP_LABEL[guest.rsvpStatus]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {guest.group || "Sin grupo"}
              {guest.plusOnes > 0 &&
                ` · +${guest.plusOnes}${guest.plusOneNames.length > 0 ? ` (${guest.plusOneNames.join(", ")})` : ""}`}
            </p>
            {guest.dietaryRestrictions && (
              <p className="text-xs text-muted-foreground">🍽 {guest.dietaryRestrictions}</p>
            )}
            {guest.notes && <p className="mt-1 text-sm text-muted-foreground">{guest.notes}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Select value={guest.tableElementId ?? NO_TABLE} onValueChange={handleTableChange}>
            <SelectTrigger className="w-full min-w-[10rem] sm:w-auto">
              <SelectValue>
                {(value: string) => {
                  if (value === NO_TABLE) return "Sin mesa asignada";
                  const table = tableOptions.find((t) => t.id === value);
                  return table ? `${table.label} (${table.occupied}/${table.capacity}) · ${table.eventName}` : value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_TABLE}>Sin mesa asignada</SelectItem>
              {tableOptions.map((table) => (
                <SelectItem key={table.id} value={table.id}>
                  {table.label} ({table.occupied}/{table.capacity}) · {table.eventName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <GuestFormDialog
            guest={guest}
            groupSuggestions={groupSuggestions}
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
            title={`¿Eliminar a ${guest.fullName}?`}
            description="Esta acción no se puede deshacer."
            onConfirm={() => deleteGuest(guest.id)}
            successMessage="Invitado eliminado"
          />
        </div>
      </CardContent>
    </Card>
  );
}
