"use client";

import { useState } from "react";
import { AlertTriangle, ChevronLeft, PartyPopper, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { markInvitationsSent } from "@/app/(app)/invitaciones/actions";
import { WhatsAppIcon } from "@/app/(app)/invitaciones/WhatsAppIcon";
import { WhatsAppBubble } from "@/app/(app)/invitaciones/WhatsAppPreview";
import { rowMessage, type InvitationRow, type MessageContextBase, type MessageSettings } from "@/app/(app)/invitaciones/shared";

/**
 * Envío uno por uno: WhatsApp no permite mandar mensajes masivos desde un enlace, así que
 * se abre cada chat con el mensaje listo y al volver se pasa al siguiente invitado.
 */
export function GuidedSendDialog({
  open,
  onOpenChange,
  queue,
  messageSettings,
  ctx,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queue: InvitationRow[];
  messageSettings: MessageSettings;
  ctx: MessageContextBase;
}) {
  // La cola se fija al montar (el padre lo monta al abrir): marcar como enviada no debe
  // mover la lista mientras se envía.
  const [snapshot] = useState<InvitationRow[]>(queue);
  const [index, setIndex] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  const current = snapshot[index];
  const done = index >= snapshot.length && snapshot.length > 0;
  const info = current ? rowMessage(current, messageSettings, ctx) : null;

  function sendCurrent() {
    if (!current) return;
    void markInvitationsSent([current.id]);
    setSentCount((n) => n + 1);
    // Se avanza después de que el navegador abra la pestaña de WhatsApp.
    setTimeout(() => setIndex((i) => i + 1), 300);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Envío guiado por WhatsApp</DialogTitle>
          <DialogDescription>
            {done
              ? "¡Listo! Ya recorriste toda la lista."
              : `Invitado ${Math.min(index + 1, snapshot.length)} de ${snapshot.length} · ${sentCount} enviadas`}
          </DialogDescription>
        </DialogHeader>

        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[#25D366] transition-all"
            style={{ width: `${snapshot.length ? (Math.min(index, snapshot.length) / snapshot.length) * 100 : 0}%` }}
          />
        </div>

        {done ? (
          <div className="flex flex-col items-center py-8 text-center">
            <PartyPopper className="size-10 text-decorative" />
            <p className="mt-3 font-heading text-xl font-semibold">{sentCount} invitaciones enviadas</p>
            <p className="mt-1 text-sm text-muted-foreground">Verás aquí cuando cada invitado abra su invitación y confirme.</p>
            <Button className="mt-5" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        ) : current && info ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-heading text-lg font-semibold">{current.fullName}</p>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {info.validPhone ? `+${info.phone}` : current.phone || "Sin teléfono"}
                </p>
              </div>
            </div>
            {!info.validPhone && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                Sin un número válido, WhatsApp te pedirá elegir el contacto antes de enviar.
              </p>
            )}
            <div className="max-h-72 overflow-y-auto rounded-xl bg-[#efeae2] p-3">
              <WhatsAppBubble text={info.message} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
                <ChevronLeft className="size-3.5" />
                Anterior
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIndex((i) => i + 1)}>
                  <SkipForward className="size-3.5" />
                  Saltar
                </Button>
                <Button
                  nativeButton={false}
                  render={<a href={info.whatsapp} target="_blank" rel="noopener noreferrer" />}
                  onClick={sendCurrent}
                  className="bg-[#25D366] text-white hover:bg-[#1ebe5a]"
                >
                  <WhatsAppIcon className="size-4" />
                  Abrir WhatsApp
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">No hay invitaciones pendientes de enviar.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
