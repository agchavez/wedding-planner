"use client";

import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";
import { revokeSessionAction } from "@/app/(admin)/admin/actions";
import { Avatar } from "@/app/(admin)/admin/_components/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminSession } from "@/lib/admin-data";
import { formatDateTime, relativeTime } from "@/lib/format";

export function SessionsTable({ sessions, currentToken }: { sessions: AdminSession[]; currentToken: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg border border-destructive/25 bg-destructive/8 px-3.5 py-2.5 text-sm text-destructive">{error}</p>
      )}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Dispositivo</th>
              <th className="px-4 py-3 font-medium">Última actividad</th>
              <th className="px-4 py-3 font-medium">Inició</th>
              <th className="px-4 py-3" aria-label="Acciones" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sessions.map((s) => {
              const isCurrent = s.token === currentToken;
              return (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.userName} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{s.userName}</p>
                        <p className="truncate text-xs text-muted-foreground">{s.userEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{s.device}</p>
                    <p className="font-mono text-xs text-muted-foreground">{s.ip || "IP desconocida"}</p>
                  </td>
                  <td suppressHydrationWarning className="px-4 py-3 text-foreground" title={formatDateTime(s.updatedAt)}>
                    {relativeTime(s.updatedAt)}
                  </td>
                  <td suppressHydrationWarning className="px-4 py-3 text-muted-foreground">{formatDateTime(s.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {isCurrent ? (
                      <Badge variant="secondary">Esta sesión</Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pendingToken !== null}
                        onClick={() => {
                          setError(null);
                          setPendingToken(s.token);
                          startTransition(async () => {
                            const result = await revokeSessionAction(s.token, s.userId);
                            if (result.error) setError(result.error);
                            setPendingToken(null);
                          });
                        }}
                      >
                        <LogOut className="size-3.5" />
                        {pendingToken === s.token ? "Cerrando…" : "Cerrar sesión"}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No hay sesiones abiertas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
