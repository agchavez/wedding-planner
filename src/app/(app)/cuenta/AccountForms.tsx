"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Status = { kind: "ok" | "error"; message: string } | null;

function StatusMessage({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p
      role="status"
      className={
        status.kind === "ok"
          ? "rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground"
          : "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
      }
    >
      {status.message}
    </p>
  );
}

export function AccountForms({ name }: { name: string }) {
  const router = useRouter();
  const passwordFormRef = useRef<HTMLFormElement>(null);
  const [profileStatus, setProfileStatus] = useState<Status>(null);
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);
  const [isSavingProfile, startProfile] = useTransition();
  const [isSavingPassword, startPassword] = useTransition();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>El nombre que ven los demás miembros de tu boda.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            action={(formData) => {
              setProfileStatus(null);
              startProfile(async () => {
                const { error } = await authClient.updateUser({ name: String(formData.get("name") ?? "").trim() });
                setProfileStatus(
                  error ? { kind: "error", message: error.message ?? "No se pudo guardar." } : { kind: "ok", message: "Perfil actualizado." }
                );
                if (!error) router.refresh();
              });
            }}
          >
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" defaultValue={name} required className="mt-1" />
            </div>
            <StatusMessage status={profileStatus} />
            <Button type="submit" disabled={isSavingProfile}>
              Guardar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contraseña</CardTitle>
          <CardDescription>Al cambiarla se cerrarán tus otras sesiones abiertas.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            ref={passwordFormRef}
            className="space-y-4"
            action={(formData) => {
              setPasswordStatus(null);
              const newPassword = String(formData.get("newPassword") ?? "");
              if (newPassword !== formData.get("confirmPassword")) {
                setPasswordStatus({ kind: "error", message: "Las contraseñas nuevas no coinciden." });
                return;
              }
              startPassword(async () => {
                const { error } = await authClient.changePassword({
                  currentPassword: String(formData.get("currentPassword") ?? ""),
                  newPassword,
                  revokeOtherSessions: true,
                });
                if (error) {
                  setPasswordStatus({
                    kind: "error",
                    message:
                      error.code === "INVALID_PASSWORD"
                        ? "La contraseña actual no es correcta."
                        : error.code === "PASSWORD_TOO_SHORT"
                          ? "La contraseña nueva debe tener al menos 8 caracteres."
                          : (error.message ?? "No se pudo cambiar la contraseña."),
                  });
                  return;
                }
                passwordFormRef.current?.reset();
                setPasswordStatus({ kind: "ok", message: "Contraseña actualizada." });
              });
            }}
          >
            <div>
              <Label htmlFor="currentPassword">Contraseña actual</Label>
              <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="newPassword">Contraseña nueva</Label>
              <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirmar contraseña nueva</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required className="mt-1" />
            </div>
            <StatusMessage status={passwordStatus} />
            <Button type="submit" disabled={isSavingPassword}>
              Cambiar contraseña
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
