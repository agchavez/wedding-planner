"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Correo o contraseña incorrectos.",
  BANNED_USER: "Tu cuenta está suspendida. Contacta al administrador.",
};

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardContent>
        <form
          className="space-y-4"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const { error } = await authClient.signIn.email({
                email: String(formData.get("email") ?? "").trim(),
                password: String(formData.get("password") ?? ""),
              });
              if (error) {
                setError(
                  error.status === 429
                    ? "Demasiados intentos. Espera un minuto e inténtalo de nuevo."
                    : (error.code && ERROR_MESSAGES[error.code]) || error.message || "No se pudo iniciar sesión."
                );
                return;
              }
              router.replace(next);
              router.refresh();
            });
          }}
        >
          <div>
            <Label htmlFor="email">Correo</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required autoFocus className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1"
            />
          </div>
          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <LoaderCircle className="size-4 animate-spin" />}
            Iniciar sesión
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
