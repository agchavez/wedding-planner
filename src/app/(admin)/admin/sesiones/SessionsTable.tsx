"use client";

import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";
import { revokeSessionAction } from "@/app/(admin)/admin/actions";
import { Avatar } from "@/app/(admin)/admin/_components/ui";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminSession } from "@/lib/admin-data";
import { formatDateTime, relativeTime, formatIp } from "@/lib/format";

export function SessionsTable({ sessions, currentToken }: { sessions: AdminSession[]; currentToken: string }) {
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function revoke(session: AdminSession) {
    setPendingToken(session.token);
    startTransition(async () => {
      const result = await revokeSessionAction(session.token, session.userId);
      if (result.error) toast.error(result.error);
      else toast.success(`Se cerró la sesión de ${session.userName}.`);
      setPendingToken(null);
    });
  }

  return (
    <div className="space-y-3">
      {/* Móvil: tarjetas apiladas en vez de tabla. */}
      <ul className="space-y-2 sm:hidden">
        {sessions.map((s) => {
          const isCurrent = s.token === currentToken;
          return (
            <li key={s.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <Avatar name={s.userName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{s.userName}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.userEmail}</p>
                </div>
                {isCurrent && <Badge variant="secondary">Esta sesión</Badge>}
              </div>
              <p className="mt-3 text-sm text-foreground">
                {s.device} · <span className="font-mono text-xs text-muted-foreground">{formatIp(s.ip)}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground" suppressHydrationWarning>
                Activa {relativeTime(s.updatedAt).toLowerCase()}
              </p>
              {!isCurrent && (
                <Button variant="outline" size="sm" className="mt-3 w-full" disabled={pendingToken !== null} onClick={() => revoke(s)}>
                  <LogOut className="size-3.5" />
                  {pendingToken === s.token ? "Cerrando…" : "Cerrar sesión"}
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card sm:block">
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
                    <p className="font-mono text-xs text-muted-foreground">{formatIp(s.ip)}</p>
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
                        onClick={() => revoke(s)}
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
