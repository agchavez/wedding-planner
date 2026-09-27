"use client";

import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { acceptInvitationAction } from "@/app/bienvenida/actions";
import { registerFromInvitationAction } from "@/app/invitacion/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ErrorMessage({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/8 px-3.5 py-2.5 text-sm text-destructive">
      {error}
    </p>
  );
}

export function AcceptInvitationButton({ invitationId }: { invitationId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mt-8 space-y-4">
      <ErrorMessage error={error} />
      <Button
        className="h-11 w-full text-[0.95rem]"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await acceptInvitationAction(invitationId);
            if (result?.error) setError(result.error);
          })
        }
      >
        {isPending && <LoaderCircle className="size-4 animate-spin" />}
        Unirme a la boda
      </Button>
    </div>
  );
}

export function RegisterFromInvitationForm({
  invitationId,
  email,
  compact = false,
}: {
  invitationId: string;
  email: string;
  compact?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className={compact ? "space-y-5" : "mt-8 space-y-5"}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await registerFromInvitationAction(invitationId, formData);
          if (result?.error) setError(result.error);
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="inv-email">Correo</Label>
        <Input id="inv-email" value={email} readOnly disabled className="h-11 px-3.5 text-base md:text-sm" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="inv-name">Tu nombre</Label>
        <Input id="inv-name" name="name" autoComplete="name" required autoFocus className="h-11 px-3.5 text-base md:text-sm" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="inv-password">Crea una contraseña</Label>
        <Input
          id="inv-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="h-11 px-3.5 text-base md:text-sm"
        />
        <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
      </div>
      <ErrorMessage error={error} />
      <Button type="submit" className="h-11 w-full text-[0.95rem]" disabled={isPending}>
        {isPending && <LoaderCircle className="size-4 animate-spin" />}
        Crear cuenta y unirme
      </Button>
    </form>
  );
}
