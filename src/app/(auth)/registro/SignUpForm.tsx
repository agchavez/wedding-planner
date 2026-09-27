"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ERROR_MESSAGES: Record<string, string> = {
  USER_ALREADY_EXISTS: "Ya existe una cuenta con ese correo. Inicia sesión o usa otro correo.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ya existe una cuenta con ese correo. Inicia sesión o usa otro correo.",
  PASSWORD_TOO_SHORT: "La contraseña debe tener al menos 8 caracteres.",
  INVALID_EMAIL: "Revisa el correo: no parece válido.",
};

export function SignUpForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className={compact ? "space-y-5" : "mt-8 space-y-5"}
      action={(formData) => {
        setError(null);
        const password = String(formData.get("password") ?? "");
        if (password !== formData.get("confirm")) {
          setError("Las contraseñas no coinciden.");
          return;
        }
        startTransition(async () => {
          const { error } = await authClient.signUp.email({
            name: String(formData.get("name") ?? "").trim(),
            email: String(formData.get("email") ?? "").trim().toLowerCase(),
            password,
          });
          if (error) {
            setError(
              error.status === 429
                ? "Demasiados registros desde esta conexión. Espera unos minutos."
                : (error.code && ERROR_MESSAGES[error.code]) || error.message || "No se pudo crear la cuenta."
            );
            return;
          }
          router.replace("/bienvenida");
          router.refresh();
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="name">Tu nombre</Label>
        <Input id="name" name="name" autoComplete="name" required className="h-11 px-3.5 text-base md:text-sm" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Correo</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          required
          className="h-11 px-3.5 text-base md:text-sm"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="h-11 px-3.5 text-base md:text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Repítela</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="h-11 px-3.5 text-base md:text-sm"
          />
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/8 px-3.5 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="h-11 w-full text-[0.95rem]" disabled={isPending}>
        {isPending && <LoaderCircle className="size-4 animate-spin" />}
        Crear cuenta
      </Button>
    </form>
  );
}
