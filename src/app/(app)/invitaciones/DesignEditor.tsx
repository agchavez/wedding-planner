"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Check, ExternalLink, Gift, Image as ImageIcon, MapPin, Palette, PartyPopper, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useWeddingAccess } from "@/components/WeddingAccess";
import { InvitationView } from "@/components/invitation/InvitationView";
import { saveInvitationDesign, type InvitationSettingsInput } from "@/app/(app)/invitaciones/actions";
import type { InvitationRow } from "@/app/(app)/invitaciones/shared";
import { INVITATION_THEMES, monogram, type InvitationThemeName } from "@/lib/invitationThemes";
import { parseEventDateTime } from "@/lib/eventTime";
import type { InvitationData } from "@/lib/guestInvitations";
import { cn } from "@/lib/utils";

export type DesignEditorValues = InvitationData & { ceremonyTime: string; receptionTime: string; rsvpDeadline: string };

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Block({ icon: Icon, title, children }: { icon: typeof Palette; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-4 flex items-center gap-2 font-heading text-lg font-semibold">
        <Icon className="size-4 text-decorative" />
        {title}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function DesignEditor({
  initial,
  base,
  sampleGuest,
}: {
  initial: DesignEditorValues;
  base: InvitationData;
  sampleGuest: InvitationRow | null;
}) {
  const { canEdit } = useWeddingAccess();
  const [values, setValues] = useState<DesignEditorValues>(initial);
  const [isPending, startTransition] = useTransition();
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  function set<K extends keyof DesignEditorValues>(key: K, value: DesignEditorValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  const input = (key: keyof DesignEditorValues, props: React.ComponentProps<typeof Input> = {}) => (
    <Input
      value={String(values[key] ?? "")}
      onChange={(e) => set(key, e.target.value as never)}
      disabled={!canEdit}
      {...props}
    />
  );

  // Vista previa en vivo: mismas reglas que al guardar.
  const preview: InvitationData = useMemo(
    () => ({
      ...base,
      ...values,
      ceremonyTime: parseEventDateTime(values.ceremonyTime)?.toISOString() ?? null,
      receptionTime: parseEventDateTime(values.receptionTime)?.toISOString() ?? null,
      rsvpDeadline: values.rsvpDeadline ? `${values.rsvpDeadline}T00:00:00.000Z` : null,
      coverImageUrl: /^https?:\/\//.test(values.coverImageUrl) ? values.coverImageUrl : "",
    }),
    [base, values]
  );

  const previewGuest = {
    fullName: sampleGuest?.fullName ?? "Ana López",
    seats: 1 + (sampleGuest?.plusOnes ?? 1),
    plusOneNames: [],
    rsvpStatus: "pending",
    attendingCount: null,
    rsvpMessage: "",
    dietaryRestrictions: "",
    responded: false,
  };

  function save() {
    const payload: InvitationSettingsInput = {
      theme: values.theme,
      headline: values.headline,
      message: values.message,
      quote: values.quote,
      coverImageUrl: values.coverImageUrl,
      ceremonyTime: values.ceremonyTime,
      ceremonyPlace: values.ceremonyPlace,
      ceremonyAddress: values.ceremonyAddress,
      ceremonyMapUrl: values.ceremonyMapUrl,
      receptionTime: values.receptionTime,
      receptionPlace: values.receptionPlace,
      receptionAddress: values.receptionAddress,
      receptionMapUrl: values.receptionMapUrl,
      dressCode: values.dressCode,
      dressCodeNote: values.dressCodeNote,
      giftsNote: values.giftsNote,
      hashtag: values.hashtag,
      rsvpDeadline: values.rsvpDeadline,
      showCountdown: values.showCountdown,
    };
    startTransition(async () => {
      try {
        await saveInvitationDesign(payload);
        toast.success("Invitación guardada", { description: "Los enlaces ya enviados muestran el nuevo diseño." });
      } catch {
        toast.error("No se pudo guardar la invitación.");
      }
    });
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_25rem]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-heading text-lg font-semibold">
            <Palette className="size-4 text-decorative" />
            Estilo
          </h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(Object.entries(INVITATION_THEMES) as [InvitationThemeName, (typeof INVITATION_THEMES)[InvitationThemeName]][]).map(
              ([key, t]) => (
                <button
                  key={key}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => set("theme", key)}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all",
                    values.theme === key ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"
                  )}
                >
                  <div className="flex h-24 flex-col items-center justify-center" style={{ background: t.paper }}>
                    <span className="text-[0.6rem] tracking-[0.25em]" style={{ color: t.gold }}>
                      {monogram(base.partner1 || "A", base.partner2 || "L")}
                    </span>
                    <span className="inv-script text-3xl" style={{ color: t.accent }}>
                      {base.partner1 || "Ana"}
                    </span>
                    <span className="mt-1 h-px w-12" style={{ background: t.gold }} />
                  </div>
                  <div className="border-t border-border bg-card px-3 py-2">
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-[0.7rem] text-muted-foreground">{t.description}</p>
                  </div>
                  {values.theme === key && (
                    <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </span>
                  )}
                </button>
              )
            )}
          </div>
        </section>

        <Block icon={ImageIcon} title="Portada y mensaje">
          <Field label="Frase de portada">{input("headline", { placeholder: "¡Nos casamos!" })}</Field>
          <Field label="Foto de portada (opcional)" hint="Enlace a una imagen (https://…). Sin foto, se usa un diseño de papel.">
            {input("coverImageUrl", { placeholder: "https://…/nuestra-foto.jpg", type: "url" })}
          </Field>
          <Field label="Mensaje de invitación" className="sm:col-span-2">
            <Textarea
              value={values.message}
              onChange={(e) => set("message", e.target.value)}
              rows={3}
              disabled={!canEdit}
              placeholder="Con la bendición de Dios y de nuestras familias, tenemos el honor de invitarte…"
            />
          </Field>
          <Field label="Cita o versículo (opcional)" className="sm:col-span-2">
            {input("quote", { placeholder: "El amor es paciente, es bondadoso…" })}
          </Field>
        </Block>

        <Block icon={MapPin} title="Ceremonia">
          <Field label="Fecha y hora">{input("ceremonyTime", { type: "datetime-local" })}</Field>
          <Field label="Lugar">{input("ceremonyPlace", { placeholder: "Parroquia San Martín" })}</Field>
          <Field label="Dirección">{input("ceremonyAddress", { placeholder: "Col. Palmira, Tegucigalpa" })}</Field>
          <Field label="Enlace de Google Maps (opcional)" hint="Si lo dejas vacío, se busca la dirección.">
            {input("ceremonyMapUrl", { type: "url", placeholder: "https://maps.app.goo.gl/…" })}
          </Field>
        </Block>

        <Block icon={PartyPopper} title="Recepción">
          <Field label="Fecha y hora">{input("receptionTime", { type: "datetime-local" })}</Field>
          <Field label="Lugar">{input("receptionPlace", { placeholder: "Hotel Real Clarion" })}</Field>
          <Field label="Dirección">{input("receptionAddress")}</Field>
          <Field label="Enlace de Google Maps (opcional)">{input("receptionMapUrl", { type: "url" })}</Field>
        </Block>

        <Block icon={Gift} title="Detalles">
          <Field label="Código de vestimenta">{input("dressCode", { placeholder: "Formal" })}</Field>
          <Field label="Nota de vestimenta">{input("dressCodeNote", { placeholder: "Evitar el color blanco" })}</Field>
          <Field label="Mesa de regalos / lluvia de sobres" className="sm:col-span-2">
            <Textarea
              value={values.giftsNote}
              onChange={(e) => set("giftsNote", e.target.value)}
              rows={2}
              disabled={!canEdit}
              placeholder="Tu presencia es nuestro mejor regalo. Si deseas obsequiarnos algo, tendremos lluvia de sobres."
            />
          </Field>
          <Field label="Hashtag">{input("hashtag", { placeholder: "#AnaYLuis2027" })}</Field>
          <Field label="Confirmar antes del">{input("rsvpDeadline", { type: "date" })}</Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox checked={values.showCountdown} onCheckedChange={(c) => set("showCountdown", Boolean(c))} disabled={!canEdit} />
            Mostrar cuenta regresiva
          </label>
        </Block>

        {canEdit && (
          <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4 text-decorative" />
              {dirty ? "Tienes cambios sin guardar" : "La vista previa refleja lo que verán tus invitados"}
            </p>
            <Button onClick={save} disabled={isPending || !dirty}>
              {isPending ? "Guardando…" : "Guardar invitación"}
            </Button>
          </div>
        )}
      </div>

      <div className="xl:sticky xl:top-20 xl:self-start">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Vista previa</p>
          {sampleGuest?.token && (
            <a
              href={`/i/${sampleGuest.token}?p=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Abrir completa
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
        <div className="mx-auto w-full max-w-[24rem] overflow-hidden rounded-[2.4rem] border-[10px] border-[#1f2328] bg-[#1f2328] shadow-2xl">
          <div className="h-[44rem] overflow-y-auto overscroll-contain rounded-[1.6rem] [scrollbar-width:none]">
            <InvitationView data={preview} guest={previewGuest} embedded />
          </div>
        </div>
      </div>
    </div>
  );
}
