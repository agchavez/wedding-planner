"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.",
  BANNED_USER: "Tu cuenta está suspendida. Pide al administrador que la reactive.",
};

export function LoginForm({ next, compact = false }: { next: string; compact?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className={compact ? "space-y-5" : "mt-8 space-y-5"}
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
                ? "Demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo."
                : (error.code && ERROR_MESSAGES[error.code]) || error.message || "No se pudo iniciar sesión."
            );
            return;
          }
          router.replace(next);
          router.refresh();
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="email">Correo</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          required
          autoFocus={!compact}
          aria-invalid={Boolean(error) || undefined}
          className="h-11 px-3.5 text-base md:text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-invalid={Boolean(error) || undefined}
            className="h-11 px-3.5 pr-11 text-base md:text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/8 px-3.5 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="h-11 w-full text-[0.95rem]" disabled={isPending}>
        {isPending && <LoaderCircle className="size-4 animate-spin" />}
        {isPending ? "Entrando…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
