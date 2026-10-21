"use client";

import { useState, useTransition } from "react";
import { Bot, Check, Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createMcpToken, revokeMcpToken } from "@/app/(app)/configuracion/mcp-actions";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWeddingAccess } from "@/components/WeddingAccess";

export type McpTokenView = {
  id: string;
  name: string;
  prefix: string;
  createdByName: string;
  createdAt: string;
  lastUsedAt: string | null;
};

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-start gap-2 rounded-lg bg-muted p-2.5">
        <pre className="flex-1 overflow-x-auto font-mono text-xs whitespace-pre-wrap break-all">{value}</pre>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={async () => {
            await navigator.clipboard.writeText(value).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          aria-label="Copiar"
        >
          {copied ? <Check className="text-emerald-600" /> : <Copy />}
        </Button>
      </div>
    </div>
  );
}

const fmt = (iso: string) => new Intl.DateTimeFormat("es-HN", { dateStyle: "medium" }).format(new Date(iso));

/** Tokens del servidor MCP: conectar Claude (u otro asistente) a los invitados de la boda. */
export function McpTokensCard({ tokens, endpoint }: { tokens: McpTokenView[]; endpoint: string }) {
  const { canEdit } = useWeddingAccess();
  const [name, setName] = useState("Claude");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function create() {
    startTransition(async () => {
      const result = await createMcpToken(name);
      if (!result.ok) toast.error(result.error);
      else setNewToken(result.token);
    });
  }

  const token = newToken ?? "<tu-token>";
  const claudeCode = `claude mcp add --transport http wedplan ${endpoint} \\\n  --header "Authorization: Bearer ${token}"`;
  const jsonConfig = JSON.stringify(
    { mcpServers: { wedplan: { type: "http", url: endpoint, headers: { Authorization: `Bearer ${token}` } } } },
    null,
    2
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Bot className="size-5" />
        </span>
        <div className="text-sm">
          <p className="font-medium">Conecta un asistente de IA (MCP)</p>
          <p className="mt-0.5 text-muted-foreground">
            Con un token, Claude puede agregar invitados, ponerles etiquetas, separar los de la novia y el novio, generar los
            enlaces de invitación con WhatsApp y revisar quién confirmó. Cada token da acceso solo a esta boda.
          </p>
        </div>
      </div>

      {canEdit && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del token" className="sm:w-60" />
          <Button onClick={create} disabled={isPending}>
            <Plus className="size-4" />
            Crear token
          </Button>
        </div>
      )}

      {newToken && (
        <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="text-sm font-medium text-emerald-900">Copia el token ahora: no se volverá a mostrar.</p>
          <CopyBlock label="Token" value={newToken} />
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <CopyBlock label="Claude Code" value={claudeCode} />
        <CopyBlock label="Claude Desktop / otros clientes (JSON)" value={jsonConfig} />
      </div>

      {tokens.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <KeyRound className="size-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {t.name} <span className="font-mono text-xs text-muted-foreground">{t.prefix}…</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Creado por {t.createdByName || "—"} el {fmt(t.createdAt)} ·{" "}
                  {t.lastUsedAt ? `usado el ${fmt(t.lastUsedAt)}` : "sin usar"}
                </p>
              </div>
              {canEdit && (
                <ConfirmDeleteDialog
                  triggerRender={<Button variant="ghost" size="icon-sm" />}
                  triggerChildren={
                    <>
                      <Trash2 className="size-3.5 text-destructive" />
                      <span className="sr-only">Revocar</span>
                    </>
                  }
                  title={`¿Revocar el token "${t.name}"?`}
                  description="El asistente que lo use perderá el acceso de inmediato."
                  onConfirm={() => revokeMcpToken(t.id)}
                  successMessage="Token revocado"
                  confirmLabel="Revocar"
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
