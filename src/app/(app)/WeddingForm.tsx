"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateWeddingDetails } from "@/app/(app)/actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { formatCalendarDate, toDateOnlyValue } from "@/lib/format";
import { Label } from "@/components/ui/label";
import type { Wedding } from "@/generated/prisma";
import { useWeddingAccess } from "@/components/WeddingAccess";

export function WeddingForm({ wedding }: { wedding: Wedding }) {
  const [editing, setEditing] = useState(false);
  const { canEdit } = useWeddingAccess();
  const hasNames = Boolean(wedding.partner1 || wedding.partner2);
  const [isPending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div className="text-center">
        <p className="font-heading text-4xl font-semibold text-primary sm:text-5xl">
          {hasNames ? (
            <>
              {wedding.partner1 || "…"}
              <span className="mx-3 text-decorative">&amp;</span>
              {wedding.partner2 || "…"}
            </>
          ) : (
            "Nuestra boda"
          )}
        </p>
        <div className="mx-auto my-4 h-px w-24 bg-decorative" />
        <p className="text-base text-muted-foreground">
          {wedding.weddingDate
            ? formatCalendarDate(wedding.weddingDate, "full")
            : "Fecha por definir"}
        </p>
        <p className="text-sm text-muted-foreground">{wedding.venueName || "Lugar por definir"}</p>
        {canEdit && (
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" />
            {hasNames ? "Editar datos de la boda" : "Agregar los nombres de la pareja"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          try {
            await updateWeddingDetails(formData);
            setEditing(false);
            toast.success("Datos de la boda guardados");
          } catch {
            toast.error("No se pudieron guardar los datos. Inténtalo de nuevo.");
          }
        });
      }}
      className="mx-auto grid max-w-2xl grid-cols-1 gap-3 text-left sm:grid-cols-2"
    >
      <div>
        <Label htmlFor="partner1">Nombre de uno</Label>
        <Input id="partner1" name="partner1" defaultValue={wedding.partner1} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="partner2">Nombre del otro</Label>
        <Input id="partner2" name="partner2" defaultValue={wedding.partner2} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="weddingDate">Fecha de la boda</Label>
        <DatePicker
          id="weddingDate"
          name="weddingDate"
          defaultValue={toDateOnlyValue(wedding.weddingDate)}
          placeholder="Fecha por definir"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="venueName">Lugar</Label>
        <Input id="venueName" name="venueName" defaultValue={wedding.venueName} className="mt-1" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="venueAddress">Dirección del lugar</Label>
        <Input id="venueAddress" name="venueAddress" defaultValue={wedding.venueAddress} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="totalBudget">Presupuesto total</Label>
        <Input
          id="totalBudget"
          name="totalBudget"
          type="number"
          step="0.01"
          defaultValue={wedding.totalBudget}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="currency">Moneda</Label>
        <Input id="currency" name="currency" defaultValue={wedding.currency} className="mt-1" />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
