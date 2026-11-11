"use client";

import { useRef, useState } from "react";
import { Eye, EyeOff, Loader2, Upload } from "lucide-react";
import { uploadInvitationSong } from "@/app/(app)/invitaciones/actions";
import { SONG_MAX_BYTES, uploadedSongOwner } from "@/lib/songFiles";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, ItineraryEditor, PaletteEditor } from "@/app/(app)/invitaciones/editor/fields";
import { PhotoField, PhotosField, type PickerPhoto } from "@/app/(app)/invitaciones/editor/PhotoPicker";
import { BLOCK_INFO, type BlockType, type Framing, type InvitationBlock, type InvitationDesign, type PhotoFraming } from "@/lib/invitationBlocks";
import type { ItineraryEntry } from "@/lib/invitationThemes";

type Kind = "text" | "area" | "photo" | "photos" | "bool" | "datetime" | "date" | "url" | "itinerary" | "colors";
type Spec = { key: string; label: string; kind: Kind; placeholder?: string; hint?: string; rows?: number };

const EVENT_FIELDS: Spec[] = [
  { key: "title", label: "Título de la sección", kind: "text" },
  { key: "time", label: "Fecha y hora", kind: "datetime", hint: "Hora de Honduras." },
  { key: "place", label: "Lugar", kind: "text", placeholder: "La Hacienda El Encanto de Jeto" },
  { key: "address", label: "Ciudad o dirección", kind: "text", placeholder: "Comayagua, Honduras" },
  { key: "note", label: "Nota", kind: "text", placeholder: "Ceremonia y recepción" },
  { key: "mapUrl", label: "Enlace de Google Maps", kind: "url", placeholder: "https://maps.app.goo.gl/…", hint: "Si lo dejas vacío, se busca el lugar." },
  { key: "showMap", label: "Mostrar el mapa", kind: "bool" },
  { key: "photoUrl", label: "Foto del lugar", kind: "photo" },
];

/** Campos de cada bloque, en el orden en que se muestran. */
const SPECS: Record<BlockType, Spec[]> = {
  cover: [
    { key: "photoUrl", label: "Foto de portada", kind: "photo", hint: "También sale en la tarjeta de WhatsApp." },
    { key: "headline", label: "Frase", kind: "text", placeholder: "¡Nos casamos!" },
    { key: "kicker", label: "Texto de la esquina", kind: "text", placeholder: "Vol. 01" },
    { key: "openingKicker", label: "Apertura: texto de arriba", kind: "text", placeholder: "Edición especial", hint: "Se le agrega la fecha." },
    { key: "openingPhotoUrl", label: "Apertura: foto", kind: "photo", hint: "Vacío: la misma de la portada." },
    { key: "marquee", label: "Cinta de frases", kind: "area", rows: 3, hint: "Una frase por línea. Vacío: fecha, ciudad y nombres." },
  ],
  guestMessage: [
    { key: "message", label: "Mensaje", kind: "area", rows: 4 },
    { key: "photoUrl", label: "Foto (Fig. 01)", kind: "photo" },
    { key: "caption", label: "Pie de foto", kind: "text", placeholder: "Fig. 01 — Nosotros" },
    { key: "showSeats", label: "Mostrar los lugares reservados", kind: "bool" },
    { key: "brideParents", label: "Padres de la novia", kind: "area", rows: 2, hint: "Un nombre por línea." },
    { key: "groomParents", label: "Padres del novio", kind: "area", rows: 2, hint: "Un nombre por línea." },
    { key: "sponsors", label: "Padrinos", kind: "area", rows: 3, hint: "Uno por línea: «Rol: Nombres»." },
  ],
  verse: [
    { key: "text", label: "Versículo", kind: "area", rows: 3, placeholder: "Y sobre todas estas cosas vestíos de amor, que es el vínculo perfecto." },
    { key: "reference", label: "Referencia", kind: "text", placeholder: "Colosenses 3:14" },
  ],
  countdown: [
    { key: "title", label: "Texto", kind: "text", placeholder: "Faltan", hint: "La fecha sale de la ceremonia (o de los datos de la boda)." },
    { key: "showCalendar", label: "Botones para agregar al calendario", kind: "bool" },
  ],
  featuredPhoto: [
    { key: "photoUrl", label: "Foto", kind: "photo" },
    { key: "caption", label: "Texto sobre la foto", kind: "text" },
  ],
  program: [
    { key: "title", label: "Título", kind: "text" },
    { key: "items", label: "Momentos", kind: "itinerary" },
  ],
  ceremony: EVENT_FIELDS,
  reception: EVENT_FIELDS,
  dressCode: [
    { key: "title", label: "Título", kind: "text" },
    { key: "code", label: "Código", kind: "text", placeholder: "Formal" },
    { key: "note", label: "Nota", kind: "area", rows: 2, placeholder: "Con cariño les pedimos no usar el color verde." },
    { key: "showIcons", label: "Íconos de traje y vestido", kind: "bool" },
    {
      key: "avoidColors",
      label: "Colores que no deben usar",
      kind: "colors",
      hint: "Aparecen tachados junto a los íconos (por ejemplo, varios tonos de verde).",
    },
    { key: "avoidLabel", label: "Texto bajo esos colores", kind: "text", placeholder: "Sin verde" },
    { key: "colors", label: "Paleta sugerida", kind: "colors" },
  ],
  gallery: [
    { key: "title", label: "Título", kind: "text" },
    { key: "photos", label: "Fotos", kind: "photos" },
  ],
  gifts: [
    { key: "title", label: "Título", kind: "text" },
    { key: "note", label: "Mensaje", kind: "area", rows: 3 },
    { key: "bankName", label: "Banco", kind: "text" },
    { key: "account", label: "Número de cuenta", kind: "text" },
    { key: "holder", label: "Titular", kind: "text" },
    { key: "registryUrl", label: "Enlace a mesa de regalos", kind: "url", placeholder: "https://…" },
  ],
  recommendations: [
    { key: "title", label: "Título", kind: "text" },
    { key: "adultsOnly", label: "Celebración solo para adultos", kind: "bool" },
    { key: "adultsOnlyText", label: "Texto de solo adultos", kind: "area", rows: 3 },
    { key: "items", label: "Recomendaciones", kind: "area", rows: 3, hint: "Una por línea." },
  ],
  rsvp: [
    { key: "title", label: "Título", kind: "text" },
    { key: "deadline", label: "Confirmar antes del", kind: "date" },
  ],
  closing: [
    { key: "kicker", label: "Texto de arriba", kind: "text", placeholder: "Llega 20 minutos antes de la ceremonia." },
    { key: "message", label: "Mensaje de cierre", kind: "text" },
    { key: "hashtag", label: "Hashtag", kind: "text", placeholder: "#AngelEIndira" },
    { key: "photoUrl", label: "Foto de cierre", kind: "photo" },
  ],
};

export function BlockInspector({
  block,
  onChange,
  onToggleHidden,
  photos,
  disabled,
}: {
  block: InvitationBlock;
  /** `key` agrupa en el historial los cambios seguidos al mismo campo. */
  onChange: (props: Record<string, unknown>, key: string) => void;
  onToggleHidden: () => void;
  photos: PickerPhoto[];
  disabled?: boolean;
}) {
  const props = block.props as Record<string, unknown>;
  const set = (key: string, value: unknown) => onChange({ ...props, [key]: value }, `${block.id}:${key}`);
  // Encuadre de las fotos (zoom y posición), por propiedad o, en la galería, por URL.
  const framing = props.framing as Framing | undefined;
  const setFraming = (key: string, f: PhotoFraming | undefined) => {
    const next = { ...(framing ?? {}) };
    if (f) next[key] = f;
    else delete next[key];
    set("framing", next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-heading text-base font-semibold">{BLOCK_INFO[block.type].label}</p>
          <p className="text-xs text-muted-foreground">{BLOCK_INFO[block.type].description}</p>
        </div>
        {block.type !== "rsvp" && (
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onToggleHidden}>
            {block.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {block.hidden ? "Oculto" : "Visible"}
          </Button>
        )}
      </div>
      {block.hidden && <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Este bloque está oculto: los invitados no lo ven.</p>}
      {SPECS[block.type].map((spec) => {
        const value = props[spec.key];
        switch (spec.kind) {
          case "bool":
            return (
              <div key={spec.key}>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={Boolean(value)} onCheckedChange={(c) => set(spec.key, Boolean(c))} disabled={disabled} />
                  {spec.label}
                </label>
                {spec.hint && <p className="mt-1 ml-6 text-xs text-muted-foreground">{spec.hint}</p>}
              </div>
            );
          case "photo":
            return (
              <Field key={spec.key} label={spec.label} hint={spec.hint}>
                <PhotoField
                  value={String(value ?? "")}
                  onChange={(u) => {
                    // Foto nueva: su encuadre empieza desde cero.
                    const next = { ...(framing ?? {}) };
                    delete next[spec.key];
                    onChange({ ...props, [spec.key]: u, ...(framing ? { framing: next } : {}) }, `${block.id}:${spec.key}`);
                  }}
                  photos={photos}
                  disabled={disabled}
                  framing={framing?.[spec.key]}
                  onFraming={framing ? (f) => setFraming(spec.key, f) : undefined}
                  aspect={block.type === "cover" && spec.key === "photoUrl" ? "9 / 16" : spec.key === "openingPhotoUrl" ? "3 / 4" : "4 / 5"}
                />
              </Field>
            );
          case "photos":
            return (
              <div key={spec.key}>
                <p className="mb-1.5 text-sm font-medium">{spec.label}</p>
                <PhotosField
                  value={(value as string[]) ?? []}
                  onChange={(v) => set(spec.key, v)}
                  photos={photos}
                  disabled={disabled}
                  framing={framing}
                  onFraming={framing ? setFraming : undefined}
                />
              </div>
            );
          case "itinerary":
            return (
              <div key={spec.key}>
                <p className="mb-1.5 text-sm font-medium">{spec.label}</p>
                <ItineraryEditor value={(value as ItineraryEntry[]) ?? []} onChange={(v) => set(spec.key, v)} disabled={disabled} />
              </div>
            );
          case "colors":
            return (
              <div key={spec.key}>
                <p className="mb-1.5 text-sm font-medium">{spec.label}</p>
                <PaletteEditor value={(value as string[]) ?? []} onChange={(v) => set(spec.key, v)} disabled={disabled} />
              </div>
            );
          case "area":
            return (
              <Field key={spec.key} label={spec.label} hint={spec.hint}>
                <Textarea
                  value={String(value ?? "")}
                  onChange={(e) => set(spec.key, e.target.value)}
                  rows={spec.rows ?? 3}
                  placeholder={spec.placeholder}
                  disabled={disabled}
                />
              </Field>
            );
          default:
            return (
              <Field key={spec.key} label={spec.label} hint={spec.hint}>
                <Input
                  type={spec.kind === "datetime" ? "datetime-local" : spec.kind === "date" ? "date" : spec.kind === "url" ? "url" : "text"}
                  value={String(value ?? "")}
                  onChange={(e) => set(spec.key, e.target.value)}
                  placeholder={spec.placeholder}
                  disabled={disabled}
                />
              </Field>
            );
        }
      })}
    </div>
  );
}

/** Ajustes que no son de un bloque: la canción. */
export function GlobalInspector({
  design,
  onChange,
  disabled,
}: {
  design: InvitationDesign;
  onChange: (song: InvitationDesign["song"], key: string) => void;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const uploaded = uploadedSongOwner(design.song.url) !== null;

  async function upload(file: File | undefined) {
    if (!file) return;
    setError("");
    if (file.size > SONG_MAX_BYTES) {
      setError(`La canción supera el límite de ${SONG_MAX_BYTES / 1024 / 1024} MB.`);
      return;
    }
    setUploading(true);
    try {
      const data = new FormData();
      data.set("song", file);
      const res = await uploadInvitationSong(data);
      if (res.ok) onChange({ url: res.url, title: design.song.title.trim() || res.title }, "song:upload");
      else setError(res.error);
    } catch {
      setError("No se pudo subir la canción. Inténtalo de nuevo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-heading text-base font-semibold">Canción</p>
        <p className="text-xs text-muted-foreground">Un botón para escucharla queda flotando en la invitación.</p>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium">Subir la canción</p>
        <input
          ref={fileRef}
          type="file"
          accept=".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a"
          className="hidden"
          onChange={(e) => void upload(e.target.files?.[0])}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={disabled || uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            {uploading ? "Subiendo…" : uploaded ? "Cambiar archivo" : "Elegir archivo"}
          </Button>
          {design.song.url && !uploading && (
            <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onChange({ url: "", title: "" }, "song:remove")}>
              Quitar canción
            </Button>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Un archivo mp3 o m4a de hasta {SONG_MAX_BYTES / 1024 / 1024} MB.</p>
        {error && (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        )}
        {design.song.url && <audio key={design.song.url} src={design.song.url} controls preload="none" className="mt-2 h-9 w-full" />}
      </div>
      <Field label="O pega un enlace al audio" hint="Un archivo de audio público. Los enlaces de Spotify o YouTube no se pueden reproducir.">
        <Input
          value={uploaded ? "" : design.song.url}
          onChange={(e) => onChange({ ...design.song, url: e.target.value }, "song:url")}
          placeholder={uploaded ? "Canción subida. Pega un enlace para reemplazarla." : "https://…/cancion.mp3"}
          disabled={disabled}
        />
      </Field>
      <Field label="Nombre de la canción">
        <Input value={design.song.title} onChange={(e) => onChange({ ...design.song, title: e.target.value }, "song:title")} disabled={disabled} />
      </Field>
      <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        Los nombres de la pareja y la fecha de la boda se cambian en Configuración. Toca un bloque de la vista previa para editarlo.
      </p>
    </div>
  );
}
