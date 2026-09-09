"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateWeddingDetails } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Wedding } from "@/generated/prisma";

function toDateInputValue(date: Date | null) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function WeddingForm({ wedding }: { wedding: Wedding }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div className="text-center">
        <p className="font-heading text-4xl font-semibold text-primary sm:text-5xl">
          {wedding.partner1 || "Novia/o 1"}
          <span className="mx-3 text-decorative">&amp;</span>
          {wedding.partner2 || "Novia/o 2"}
        </p>
        <div className="mx-auto my-4 h-px w-24 bg-decorative" />
        <p className="text-base text-muted-foreground">
          {wedding.weddingDate
            ? new Intl.DateTimeFormat("es-HN", { dateStyle: "full" }).format(new Date(wedding.weddingDate))
            : "Fecha por definir"}
        </p>
        <p className="text-sm text-muted-foreground">{wedding.venueName || "Lugar por definir"}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setEditing(true)}>
          <Pencil className="size-3.5" />
          Editar datos de la boda
        </Button>
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await updateWeddingDetails(formData);
          setEditing(false);
        });
      }}
      className="mx-auto grid max-w-2xl grid-cols-1 gap-3 text-left sm:grid-cols-2"
    >
      <div>
        <Label htmlFor="partner1">Novia/o 1</Label>
        <Input id="partner1" name="partner1" defaultValue={wedding.partner1} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="partner2">Novia/o 2</Label>
        <Input id="partner2" name="partner2" defaultValue={wedding.partner2} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="weddingDate">Fecha de la boda</Label>
        <Input
          id="weddingDate"
          name="weddingDate"
          type="date"
          defaultValue={toDateInputValue(wedding.weddingDate)}
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
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
