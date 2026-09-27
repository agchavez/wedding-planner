"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Heart, LoaderCircle } from "lucide-react";
import { acceptInvitationAction, createWeddingAction } from "@/app/bienvenida/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { roleLabel } from "@/lib/permissions";

type Invitation = { id: string; weddingName: string; role: string };

export function PendingInvitations({ invitations }: { invitations: Invitation[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <ul className="mt-6 space-y-2">
      {invitations.map((inv) => (
        <li key={inv.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <Heart className="size-4 shrink-0 text-decorative" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{inv.weddingName}</p>
            <p className="text-xs text-muted-foreground">Te invitaron como {roleLabel(inv.role).toLowerCase()}</p>
          </div>
          <Button
            size="sm"
            disabled={pendingId !== null}
            onClick={() => {
              setPendingId(inv.id);
              setError(null);
              startTransition(async () => {
                const result = await acceptInvitationAction(inv.id);
                if (result?.error) setError(result.error);
                setPendingId(null);
              });
            }}
          >
            {pendingId === inv.id && <LoaderCircle className="size-3.5 animate-spin" />}
            Unirme
          </Button>
        </li>
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </ul>
  );
}

export function CreateWeddingForm({ showHeading, cancelHref }: { showHeading: boolean; cancelHref: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="mt-8 space-y-5"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await createWeddingAction(formData);
          if (result?.error) setError(result.error);
        });
      }}
    >
      {showHeading && <h2 className="font-heading text-xl font-semibold text-foreground">Crear mi boda</h2>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="partner1">Nombre de uno</Label>
          <Input id="partner1" name="partner1" placeholder="Ana" required className="h-11 px-3.5 text-base md:text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="partner2">Nombre del otro</Label>
          <Input id="partner2" name="partner2" placeholder="Luis" required className="h-11 px-3.5 text-base md:text-sm" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="weddingDate">Fecha de la boda</Label>
        <Input id="weddingDate" name="weddingDate" type="date" className="h-11 px-3.5 text-base md:text-sm" />
        <p className="text-xs text-muted-foreground">Si aún no la tienen, déjala vacía y agrégala después.</p>
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/8 px-3.5 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="h-11 w-full text-[0.95rem]" disabled={isPending}>
        {isPending && <LoaderCircle className="size-4 animate-spin" />}
        Crear boda
      </Button>
      {cancelHref && (
        <Link href={cancelHref} className="block text-center text-sm text-muted-foreground hover:text-foreground">
          Volver a mi boda
        </Link>
      )}
    </form>
  );
}
