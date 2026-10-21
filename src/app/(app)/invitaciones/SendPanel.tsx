"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Link2,
  MailCheck,
  MoreHorizontal,
  RefreshCw,
  Search,
  Sparkles,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/EmptyState";
import { useWeddingAccess } from "@/components/WeddingAccess";
import { LabelPicker } from "@/app/(app)/invitados/LabelPicker";
import { LabelChip } from "@/app/(app)/invitados/LabelChip";
import {
  markInvitationsSent,
  regenerateInvitationLink,
  updateGuestPhone,
} from "@/app/(app)/invitaciones/actions";
import { GuidedSendDialog } from "@/app/(app)/invitaciones/GuidedSendDialog";
import { WhatsAppIcon } from "@/app/(app)/invitaciones/WhatsAppIcon";
import {
  copyText,
  rowMessage,
  rowStatus,
  type InvitationRow,
  type MessageContextBase,
  type MessageSettings,
} from "@/app/(app)/invitaciones/shared";
import { GUEST_SIDES, SIDE_LABEL, type LabelOption } from "@/lib/guestLabels";
import { INVITATION_STATUS, type InvitationStatus } from "@/lib/invitationMessage";
import { nameKey } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const STATUS_ORDER: InvitationStatus[] = ["not_sent", "sent", "opened", "confirmed", "declined"];

function relative(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

function Funnel({ rows }: { rows: InvitationRow[] }) {
  const total = rows.length;
  const sent = rows.filter((r) => r.invitationSentAt || r.invitationOpenedAt || r.rsvpRespondedAt).length;
  const opened = rows.filter((r) => r.invitationOpenedAt).length;
  const confirmed = rows.filter((r) => r.rsvpStatus === "confirmed");
  const declined = rows.filter((r) => r.rsvpStatus === "declined").length;
  const people = confirmed.reduce((s, r) => s + (r.attendingCount ?? 1 + r.plusOnes), 0);
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  const steps = [
    { label: "Enviadas", value: sent, pct: pct(sent), bar: "bg-sky-500" },
    { label: "Abiertas", value: opened, pct: pct(opened), bar: "bg-violet-500" },
    { label: "Confirmaron", value: confirmed.length, pct: pct(confirmed.length), bar: "bg-emerald-500", hint: `${people} personas` },
    { label: "No asistirán", value: declined, pct: pct(declined), bar: "bg-rose-400" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {steps.map((s) => (
        <div key={s.label} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xs tabular-nums text-muted-foreground">{s.pct}%</p>
          </div>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
            {s.value}
            <span className="ml-1 text-sm font-normal text-muted-foreground">/ {total}</span>
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full transition-all", s.bar)} style={{ width: `${s.pct}%` }} />
          </div>
          {s.hint && <p className="mt-1.5 text-[0.7rem] text-muted-foreground">{s.hint}</p>}
        </div>
      ))}
    </div>
  );
}

function PhoneField({ row, canEdit, valid }: { row: InvitationRow; canEdit: boolean; valid: boolean }) {
  const [value, setValue] = useState(row.phone);
  const [isPending, startTransition] = useTransition();

  if (!canEdit) return <span className="text-sm text-muted-foreground">{row.phone || "Sin teléfono"}</span>;

  function save() {
    if (value.trim() === row.phone) return;
    startTransition(async () => {
      try {
        await updateGuestPhone(row.id, value);
        toast.success(`Teléfono de ${row.fullName} guardado`);
      } catch {
        toast.error("No se pudo guardar el teléfono.");
      }
    });
  }

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        placeholder="Agregar WhatsApp"
        inputMode="tel"
        disabled={isPending}
        className={cn(
          "h-8 w-full rounded-md border border-transparent bg-transparent px-2 text-sm tabular-nums outline-none transition-colors placeholder:text-muted-foreground/70 hover:border-input focus:border-ring focus:bg-card sm:w-40",
          value && !valid && "text-amber-700"
        )}
      />
      {value && !valid && (
        <AlertTriangle className="absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-amber-600" aria-label="Número incompleto" />
      )}
    </div>
  );
}

export function SendPanel({
  rows,
  labels,
  messageSettings,
  ctx,
  onGoTo,
  needsSetup,
}: {
  rows: InvitationRow[];
  labels: LabelOption[];
  messageSettings: MessageSettings;
  ctx: MessageContextBase;
  onGoTo: (tab: string) => void;
  needsSetup: boolean;
}) {
  const { canEdit } = useWeddingAccess();
  const [side, setSide] = useState("all");
  const [status, setStatus] = useState<InvitationStatus | "all">("all");
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [guidedOpen, setGuidedOpen] = useState(false);
  const [, startTransition] = useTransition();

  const labelById = useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels]);

  const base = useMemo(() => {
    const q = nameKey(query);
    return rows.filter((r) => {
      if (side !== "all" && (side === "none" ? r.side : r.side !== side)) return false;
      if (labelFilter.length > 0 && !labelFilter.every((id) => r.labelIds.includes(id))) return false;
      return !q || nameKey(`${r.fullName} ${r.phone}`).includes(q);
    });
  }, [rows, side, labelFilter, query]);

  const filtered = status === "all" ? base : base.filter((r) => rowStatus(r) === status);
  const toSend = filtered.filter((r) => rowStatus(r) === "not_sent");
  const messages = rows
    .filter((r) => r.rsvpMessage && r.rsvpRespondedAt)
    .sort((a, b) => (b.rsvpRespondedAt ?? "").localeCompare(a.rsvpRespondedAt ?? ""));

  function markSent(ids: string[], sent = true) {
    startTransition(async () => {
      try {
        await markInvitationsSent(ids, sent);
      } catch {
        toast.error("No se pudo actualizar el estado.");
      }
    });
  }

  function exportCsv() {
    const header = ["Nombre", "Lado", "Etiquetas", "Teléfono", "Estado", "Personas confirmadas", "Enlace", "Mensaje"];
    const lines = filtered.map((r) => {
      const { message } = rowMessage(r, messageSettings, ctx);
      return [
        r.fullName,
        SIDE_LABEL[r.side] ?? "",
        r.labelIds.map((id) => labelById.get(id)?.name ?? "").filter(Boolean).join(", "),
        r.phone,
        INVITATION_STATUS[rowStatus(r)].label,
        r.rsvpStatus === "confirmed" ? String(r.attendingCount ?? 1 + r.plusOnes) : "",
        r.url,
        message,
      ];
    });
    const csv = [header, ...lines].map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "invitaciones.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={MailCheck}
        title="Todavía no hay invitados"
        description="Agrega a tus invitados en la sección Invitados; cada uno tendrá su enlace personal de invitación."
      />
    );
  }

  return (
    <div className="space-y-5">
      {needsSetup && canEdit && (
        <div className="flex flex-col gap-3 rounded-xl border border-decorative/40 bg-accent/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-decorative" />
            <div>
              <p className="text-sm font-medium">Antes de enviar, completa tu invitación</p>
              <p className="text-sm text-muted-foreground">
                Agrega la fecha de la boda (en Ajustes) y el lugar y hora de la ceremonia para que la vista previa en WhatsApp luzca completa.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => onGoTo("diseno")}>
            Ir al diseño
          </Button>
        </div>
      )}

      <Funnel rows={base} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-muted/60 p-0.5">
            {[{ value: "all", short: "Todos" }, ...GUEST_SIDES].map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSide(s.value)}
                className={cn(
                  "rounded-md px-3 py-1 text-sm transition-all",
                  side === s.value ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s.short}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar invitado"
              className="h-8 w-44 rounded-lg border border-input bg-card pr-2 pl-7 text-sm outline-none focus-visible:border-ring"
            />
          </div>
          {labels.length > 0 && (
            <LabelPicker labels={labels} value={labelFilter} onChange={setLabelFilter} allowCreate={false} placeholder="Etiquetas" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <Button onClick={() => setGuidedOpen(true)} disabled={toSend.length === 0} className="bg-[#25D366] text-white hover:bg-[#1ebe5a]">
              <WhatsAppIcon className="size-4" />
              Envío guiado
              <span className="rounded-full bg-white/25 px-1.5 text-xs tabular-nums">{toSend.length}</span>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="Más acciones" />}>
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-60">
              <DropdownMenuItem
                onClick={() =>
                  copyText(filtered.map((r) => `${r.fullName}: ${r.url}`).join("\n"), `${filtered.length} enlaces copiados`)
                }
              >
                <Link2 />
                Copiar enlaces ({filtered.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportCsv}>
                <Download />
                Exportar CSV ({filtered.length})
              </DropdownMenuItem>
              {canEdit && toSend.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => markSent(toSend.map((r) => r.id))}>
                    <MailCheck />
                    Marcar {toSend.length} como enviadas
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {(["all", ...STATUS_ORDER] as const).map((s) => {
          const count = s === "all" ? base.length : base.filter((r) => rowStatus(r) === s).length;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
              className={cn(
                "rounded-full px-3 py-1 text-sm transition-colors",
                status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              )}
            >
              {s === "all" ? "Todas" : INVITATION_STATUS[s].label} <span className="tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="Nadie en este filtro" description="Prueba con otro lado, etiqueta o estado." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {filtered.map((row) => {
              const st = rowStatus(row);
              const { message, validPhone, whatsapp } = rowMessage(row, messageSettings, ctx);
              const rowLabels = row.labelIds.map((id) => labelById.get(id)).filter(Boolean) as LabelOption[];
              return (
                <li key={row.id} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate font-medium">{row.fullName}</p>
                      {row.plusOnes > 0 && <span className="text-xs text-muted-foreground">+{row.plusOnes}</span>}
                      {row.side && (
                        <span className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
                          · {SIDE_LABEL[row.side]}
                        </span>
                      )}
                    </div>
                    {rowLabels.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {rowLabels.map((l) => (
                          <LabelChip key={l.id} name={l.name} color={l.color} />
                        ))}
                      </div>
                    )}
                  </div>

                  <PhoneField row={row} canEdit={canEdit} valid={validPhone} />

                  <div className="flex w-36 flex-col">
                    <span className={cn("w-fit rounded-full px-2 py-0.5 text-xs font-medium", INVITATION_STATUS[st].className)}>
                      {INVITATION_STATUS[st].label}
                      {st === "confirmed" && ` · ${row.attendingCount ?? 1 + row.plusOnes}`}
                    </span>
                    <span className="mt-0.5 text-[0.7rem] text-muted-foreground">
                      {st === "opened"
                        ? `${relative(row.invitationOpenedAt)} · ${row.invitationViews} ${row.invitationViews === 1 ? "vista" : "vistas"}`
                        : st === "sent"
                          ? relative(row.invitationSentAt)
                          : st === "confirmed" || st === "declined"
                            ? relative(row.rsvpRespondedAt)
                            : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {row.url && (
                      <Button
                        size="sm"
                        nativeButton={false}
                        render={<a href={whatsapp} target="_blank" rel="noopener noreferrer" />}
                        onClick={() => canEdit && !row.invitationSentAt && markSent([row.id])}
                        className="bg-[#25D366] text-white hover:bg-[#1ebe5a]"
                        title={validPhone ? "Abrir el chat con el mensaje listo" : "Sin teléfono: elige el contacto en WhatsApp"}
                      >
                        <WhatsAppIcon className="size-3.5" />
                        Enviar
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => copyText(row.url, "Enlace copiado")}
                      aria-label="Copiar enlace"
                      disabled={!row.url}
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Más" />}>
                        <MoreHorizontal className="size-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-56">
                        <DropdownMenuItem onClick={() => copyText(message, "Mensaje copiado")}>
                          <Copy />
                          Copiar mensaje completo
                        </DropdownMenuItem>
                        {row.token && (
                          <DropdownMenuItem onClick={() => window.open(`/i/${row.token}?p=1`, "_blank")}>
                            <Eye />
                            Ver su invitación
                            <ExternalLink className="ml-auto size-3" />
                          </DropdownMenuItem>
                        )}
                        {canEdit && (
                          <>
                            <DropdownMenuSeparator />
                            {row.invitationSentAt ? (
                              <DropdownMenuItem onClick={() => markSent([row.id], false)}>
                                <Undo2 />
                                Marcar como no enviada
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => markSent([row.id])}>
                                <Check />
                                Marcar como enviada
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() =>
                                startTransition(async () => {
                                  await regenerateInvitationLink(row.id);
                                  toast.success("Enlace nuevo generado", { description: "El enlace anterior ya no funciona." });
                                })
                              }
                            >
                              <RefreshCw />
                              Generar enlace nuevo
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {messages.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-heading text-xl font-semibold">Mensajes de tus invitados</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {messages.slice(0, 12).map((r) => (
              <figure key={r.id} className="rounded-xl border border-border bg-card p-4">
                <blockquote className="font-[family-name:var(--font-inv-serif)] text-lg italic leading-snug">“{r.rsvpMessage}”</blockquote>
                <figcaption className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{r.fullName}</span>
                  <span>{relative(r.rsvpRespondedAt)}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      {canEdit && guidedOpen && (
        <GuidedSendDialog
          open={guidedOpen}
          onOpenChange={setGuidedOpen}
          queue={toSend}
          messageSettings={messageSettings}
          ctx={ctx}
        />
      )}
    </div>
  );
}

