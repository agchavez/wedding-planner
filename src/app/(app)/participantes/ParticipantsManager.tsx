"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Copy, LinkIcon, LoaderCircle, LogOut, MailPlus, Trash2, X } from "lucide-react";
import {
  cancelInvitationAction,
  inviteParticipantAction,
  leaveWeddingAction,
  removeParticipantAction,
  updateParticipantRoleAction,
  type ActionResult,
} from "@/app/(app)/participantes/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { roleLabel, WEDDING_ROLES, type WeddingRole } from "@/lib/permissions";

export type Participant = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: WeddingRole;
  joinedAt: string;
};

export type PendingInvite = { id: string; email: string; role: WeddingRole; expiresAt: string; link: string };

type Notice = { kind: "ok" | "error"; message: string } | null;

const dateFormat = new Intl.DateTimeFormat("es-HN", { dateStyle: "medium" });

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copiado" : "Copiar enlace"}
    </Button>
  );
}

export function ParticipantsManager({
  participants,
  invites,
  currentUserId,
  myRole,
  canManage,
}: {
  participants: Participant[];
  invites: PendingInvite[];
  currentUserId: string;
  myRole: WeddingRole;
  canManage: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const assignableRoles = WEDDING_ROLES.filter((r) => r.value !== "owner" || myRole === "owner");

  function perform(action: () => Promise<ActionResult | void>, success: string) {
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setNotice({ kind: "error", message: result.error });
      else setNotice({ kind: "ok", message: success });
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        {notice && (
          <p
            role="status"
            className={
              notice.kind === "ok"
                ? "rounded-lg bg-accent px-3.5 py-2.5 text-sm text-accent-foreground"
                : "rounded-lg border border-destructive/25 bg-destructive/8 px-3.5 py-2.5 text-sm text-destructive"
            }
          >
            {notice.message}
          </p>
        )}

        <Card className="py-0">
          <CardContent className="px-0">
            <ul className="divide-y divide-border">
              {participants.map((p) => {
                const isSelf = p.userId === currentUserId;
                const editable = canManage && !isSelf && (p.role !== "owner" || myRole === "owner");
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:flex-nowrap">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                      {initials(p.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {p.name}
                        {isSelf && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(tú)</span>}
                      </p>
                      <p suppressHydrationWarning className="truncate text-xs text-muted-foreground">
                        {p.email} · desde {dateFormat.format(new Date(p.joinedAt))}
                      </p>
                    </div>
                    {editable ? (
                      <div className="flex items-center gap-1.5">
                        <Select
                          value={p.role}
                          onValueChange={(role) =>
                            role &&
                            role !== p.role &&
                            perform(
                              () => updateParticipantRoleAction(p.id, p.name, role),
                              `${p.name} ahora es ${roleLabel(role).toLowerCase()}.`
                            )
                          }
                        >
                          <SelectTrigger className="w-40" aria-label={`Rol de ${p.name}`}>
                            <SelectValue>{(value: string) => roleLabel(value)}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {assignableRoles.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <ConfirmDeleteDialog
                          triggerRender={<Button variant="ghost" size="icon-sm" aria-label={`Quitar a ${p.name}`} />}
                          triggerChildren={<Trash2 className="size-4" />}
                          title={`¿Quitar a ${p.name}?`}
                          description="Dejará de ver y editar esta boda. Podrás invitarle de nuevo cuando quieras."
                          onConfirm={() => perform(() => removeParticipantAction(p.id, p.name), `${p.name} ya no participa en la boda.`)}
                          confirmLabel="Quitar"
                        />
                      </div>
                    ) : (
                      <Badge variant={p.role === "owner" ? "default" : "secondary"}>{roleLabel(p.role)}</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {invites.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-semibold text-foreground">Invitaciones pendientes</h2>
            <ul className="space-y-2">
              {invites.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border bg-card/60 px-4 py-3"
                >
                  <MailPlus className="size-4 shrink-0 text-decorative" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{inv.email}</p>
                    <p suppressHydrationWarning className="text-xs text-muted-foreground">
                      {roleLabel(inv.role)} · vence el {dateFormat.format(new Date(inv.expiresAt))}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1.5">
                      <CopyLinkButton link={inv.link} />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Cancelar invitación de ${inv.email}`}
                        disabled={isPending}
                        onClick={() => perform(() => cancelInvitationAction(inv.id, inv.email), `Invitación de ${inv.email} cancelada.`)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {myRole !== "owner" && (
          <ConfirmDeleteDialog
            triggerRender={<Button variant="ghost" className="text-muted-foreground" />}
            triggerChildren={
              <>
                <LogOut className="size-4" />
                Salir de esta boda
              </>
            }
            title="¿Salir de esta boda?"
            description="Dejarás de verla. Para volver necesitarás una nueva invitación."
            onConfirm={() => perform(() => leaveWeddingAction(), "Saliste de la boda.")}
            confirmLabel="Salir de la boda"
            requiresEdit={false}
          />
        )}
      </div>

      <aside className="space-y-6">
        {canManage ? (
          <Card>
            <CardHeader>
              <CardTitle>Invitar a alguien</CardTitle>
              <CardDescription>Se genera un enlace para compartir por WhatsApp o correo. Vence en 7 días.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                ref={formRef}
                className="space-y-4"
                action={(formData) => {
                  setNotice(null);
                  setNewLink(null);
                  startTransition(async () => {
                    const result = await inviteParticipantAction(formData);
                    if (result.error) {
                      setNotice({ kind: "error", message: result.error });
                      return;
                    }
                    formRef.current?.reset();
                    setNewLink(result.link ?? null);
                  });
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">Correo</Label>
                  <Input id="invite-email" name="email" type="email" placeholder="nombre@correo.com" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Rol</Label>
                  <Select name="role" defaultValue="member">
                    <SelectTrigger className="w-full">
                      <SelectValue>{(value: string) => roleLabel(value)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {assignableRoles.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <LinkIcon className="size-4" />}
                  Crear invitación
                </Button>
              </form>
              {newLink && (
                <div className="mt-4 space-y-2 rounded-lg bg-accent p-3">
                  <p className="text-sm font-medium text-accent-foreground">Invitación lista. Comparte este enlace:</p>
                  <p className="break-all rounded-md bg-background/70 px-2 py-1.5 font-mono text-xs text-foreground">{newLink}</p>
                  <CopyLinkButton link={newLink} />
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            Tu rol es {roleLabel(myRole).toLowerCase()}. Para invitar a alguien, pídeselo a la pareja o a un organizador.
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Qué puede hacer cada rol</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {WEDDING_ROLES.map((r) => (
                <div key={r.value}>
                  <dt className="text-sm font-medium text-foreground">{r.label}</dt>
                  <dd className="text-sm text-muted-foreground">{r.description}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
