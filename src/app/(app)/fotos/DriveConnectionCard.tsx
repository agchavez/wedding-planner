"use client";

import { useTransition } from "react";
import { HardDrive } from "lucide-react";
import { disconnectDrive } from "@/app/(app)/fotos/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWeddingAccess } from "@/components/WeddingAccess";

export function DriveConnectionCard({
  configured,
  accountEmail,
}: {
  configured: boolean;
  accountEmail: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const { canEdit } = useWeddingAccess();

  if (!configured) return null;

  return (
    <Card size="sm">
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <HardDrive className="size-4" />
          </div>
          {accountEmail ? (
            <p className="text-sm text-foreground">
              Conectado con <span className="font-medium">{accountEmail}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {canEdit ? "Conecta tu Google Drive para subir fotos y videos." : "Google Drive no está conectado."}
            </p>
          )}
        </div>
        {!canEdit ? null : accountEmail ? (
          <Button variant="outline" size="sm" disabled={isPending} onClick={() => startTransition(disconnectDrive)}>
            {isPending ? "Desconectando..." : "Desconectar"}
          </Button>
        ) : (
          <Button size="sm" render={<a href="/api/google-drive/connect" />}>
            Conectar con Google Drive
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
