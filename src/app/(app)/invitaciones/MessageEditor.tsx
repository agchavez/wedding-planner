"use client";

import { useRef, useState, useTransition } from "react";
import { Info, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWeddingAccess } from "@/components/WeddingAccess";
import { saveWhatsappSettings } from "@/app/(app)/invitaciones/actions";
import { WhatsAppBubble, WhatsAppPhone } from "@/app/(app)/invitaciones/WhatsAppPreview";
import { rowMessage, type InvitationRow, type MessageContextBase, type MessageSettings } from "@/app/(app)/invitaciones/shared";
import { DEFAULT_WHATSAPP_TEMPLATE, firstName, TEMPLATE_VARIABLES } from "@/lib/invitationMessage";

export function MessageEditor({
  initial,
  sample,
  ctx,
  previewDescription,
}: {
  initial: MessageSettings;
  sample: InvitationRow | null;
  ctx: MessageContextBase;
  previewDescription: string;
}) {
  const { canEdit } = useWeddingAccess();
  const [template, setTemplate] = useState(initial.template || DEFAULT_WHATSAPP_TEMPLATE);
  const [countryCode, setCountryCode] = useState(initial.defaultCountryCode);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const demo: InvitationRow = sample ?? {
    id: "demo",
    fullName: "Ana López",
    side: "",
    labelIds: [],
    phone: "",
    plusOnes: 1,
    rsvpStatus: "pending",
    attendingCount: null,
    rsvpMessage: "",
    rsvpRespondedAt: null,
    invitationSentAt: null,
    invitationOpenedAt: null,
    invitationViews: 0,
    token: null,
    url: "https://wedding.partners.hn/i/ejemplo",
  };
  const { message } = rowMessage(demo, { template, defaultCountryCode: countryCode }, ctx);
  const domain = demo.url ? new URL(demo.url).host : "";

  function insertVariable(variable: string) {
    const el = textareaRef.current;
    if (!el) return setTemplate((t) => t + variable);
    const { selectionStart, selectionEnd } = el;
    const next = template.slice(0, selectionStart) + variable + template.slice(selectionEnd);
    setTemplate(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selectionStart + variable.length, selectionStart + variable.length);
    });
  }

  function save() {
    startTransition(async () => {
      try {
        await saveWhatsappSettings({ template, defaultCountryCode: countryCode });
        toast.success("Mensaje guardado");
      } catch {
        toast.error("No se pudo guardar el mensaje.");
      }
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-5">
        <div>
          <Label htmlFor="wa-template">Mensaje que acompaña al enlace</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Usa *asteriscos* para negrita y _guiones bajos_ para cursiva, como en WhatsApp.
          </p>
          <Textarea
            id="wa-template"
            ref={textareaRef}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={11}
            disabled={!canEdit}
            className="mt-2 font-mono text-[0.85rem] leading-relaxed"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TEMPLATE_VARIABLES.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertVariable(v.key)}
                disabled={!canEdit}
                title={v.description}
                className="rounded-md border border-dashed border-border px-2 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {v.key}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-xs">
          <Label htmlFor="cc">Código de país por defecto</Label>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">+</span>
            <Input
              id="cc"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              disabled={!canEdit}
              className="w-24"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Se antepone a los teléfonos locales (ej. 9999-9999). Para otros países escribe el número con +.
          </p>
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <p>
            WhatsApp arma la tarjeta con la imagen a partir del <strong>primer enlace</strong> del mensaje. La imagen se
            personaliza con el nombre de cada invitado. Si un contacto no te tiene guardado, WhatsApp puede ocultar la vista
            previa hasta que responda.
          </p>
        </div>

        {canEdit && (
          <div className="flex gap-2">
            <Button onClick={save} disabled={isPending}>
              {isPending ? "Guardando…" : "Guardar mensaje"}
            </Button>
            <Button variant="ghost" onClick={() => setTemplate(DEFAULT_WHATSAPP_TEMPLATE)}>
              <RotateCcw className="size-3.5" />
              Restaurar el predeterminado
            </Button>
          </div>
        )}
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <p className="mb-3 text-center text-xs uppercase tracking-wider text-muted-foreground">
          Así lo verá {firstName(demo.fullName)}
        </p>
        <WhatsAppPhone contactName={demo.fullName}>
          <WhatsAppBubble
            text={message}
            preview={
              demo.token
                ? {
                    image: `/i/${demo.token}/opengraph-image`,
                    title: `${firstName(demo.fullName)}, te invitamos a la boda de ${ctx.coupleNames}`,
                    description: `${previewDescription}. Abre tu invitación y confirma tu asistencia 💌`,
                    domain,
                  }
                : null
            }
          />
        </WhatsAppPhone>
      </div>
    </div>
  );
}
