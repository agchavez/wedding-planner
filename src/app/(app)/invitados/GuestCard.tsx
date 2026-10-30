"use client";

import { useTransition } from "react";
import { MessageCircle, Pencil, Trash2 } from "lucide-react";
import { assignGuestTable, deleteGuest } from "@/app/(app)/invitados/actions";
import { GuestFormDialog } from "@/app/(app)/invitados/GuestFormDialog";
import { LabelChip } from "@/app/(app)/invitados/LabelChip";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RSVP_LABEL } from "@/app/(app)/invitados/constants";
import { SIDE_LABEL, type LabelOption } from "@/lib/guestLabels";
import { INVITATION_STATUS, invitationStatus } from "@/lib/invitationMessage";
import type { Guest } from "@/generated/prisma";
import type { TableOption } from "@/lib/seatingLayout";
import { cn } from "@/lib/utils";

const RSVP_CLASSES: Record<string, string> = {
  pending: "",
  confirmed: "border-transparent bg-emerald-100 text-emerald-800",
  declined: "border-transparent bg-destructive/10 text-destructive",
};

const SIDE_AVATAR: Record<string, string> = {
  bride: "bg-rose-100 text-rose-800",
  groom: "bg-sky-100 text-sky-800",
  both: "bg-amber-100 text-amber-900",
  "": "bg-accent text-accent-foreground",
};

const NO_TABLE = "none";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function GuestCard({
  guest,
  tableOptions,
  groupSuggestions,
  labels,
  labelById,
  selectable = false,
  selected = false,
  onToggleSelect,
}: {
  guest: Guest;
  tableOptions: TableOption[];
  groupSuggestions: string[];
  labels: LabelOption[];
  labelById: Map<string, LabelOption>;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const [, startTransition] = useTransition();
  const status = invitationStatus(guest);

  function handleTableChange(value: string | null) {
    startTransition(() => assignGuestTable(guest.id, !value || value === NO_TABLE ? null : value));
  }

  const guestLabels = guest.labelIds.map((id) => labelById.get(id)).filter(Boolean) as LabelOption[];

  return (
    <Card className={cn("transition-colors", selected && "ring-2 ring-primary/40")}>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          {selectable && (
            <Checkbox checked={selected} onCheckedChange={onToggleSelect} className="mt-3" aria-label={`Seleccionar a ${guest.fullName}`} />
          )}
          <div
            className={cn(
              "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
              SIDE_AVATAR[guest.side] ?? SIDE_AVATAR[""]
            )}
            title={SIDE_LABEL[guest.side]}
          >
            {initials(guest.fullName)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-medium text-foreground">{guest.fullName}</p>
              <Badge variant="outline" className={RSVP_CLASSES[guest.rsvpStatus]}>
                {RSVP_LABEL[guest.rsvpStatus]}
                {guest.rsvpStatus === "confirmed" && guest.attendingCount ? ` · ${guest.attendingCount}` : ""}
              </Badge>
              {status !== "not_sent" && status !== "confirmed" && status !== "declined" && (
                <Badge variant="outline" className={cn("border-transparent", INVITATION_STATUS[status].className)}>
                  Invitación {INVITATION_STATUS[status].label.toLowerCase()}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {guest.side ? <span className="font-medium">{SIDE_LABEL[guest.side]}</span> : null}
              {guest.side ? " · " : ""}
              {guest.group || "Sin grupo"}
              {guest.plusOnes > 0 &&
                ` · +${guest.plusOnes}${guest.plusOneNames.length > 0 ? ` (${guest.plusOneNames.join(", ")})` : ""}`}
              {guest.phone && (
                <span className="ml-1 inline-flex items-center gap-0.5">
                  · <MessageCircle className="size-3" /> {guest.phone}
                </span>
              )}
            </p>
            {guestLabels.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {guestLabels.map((l) => (
                  <LabelChip key={l.id} name={l.name} color={l.color} />
                ))}
              </div>
            )}
            {guest.dietaryRestrictions && (
              <p className="mt-1 text-xs text-muted-foreground">🍽 {guest.dietaryRestrictions}</p>
            )}
            {guest.rsvpMessage && (
              <p className="mt-1 text-sm italic text-muted-foreground">“{guest.rsvpMessage}”</p>
            )}
            {guest.notes && <p className="mt-1 text-sm text-muted-foreground">{guest.notes}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {/* Si su mesa se borró del plano, el id ya no está en ninguna distribución: "Sin mesa". */}
          <Select
            value={guest.tableElementId && tableOptions.some((t) => t.id === guest.tableElementId) ? guest.tableElementId : NO_TABLE}
            onValueChange={handleTableChange}
          >
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
            labels={labels}
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
