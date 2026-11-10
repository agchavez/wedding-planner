"use client";

import { useState } from "react";
import { Check, Crop, ImagePlus, Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  framingStyle,
  isSafeImageUrl,
  type Framing,
  type PhotoFraming,
} from "@/lib/invitationBlocks";
import { FramingEditor } from "@/app/(app)/invitaciones/editor/FramingEditor";
import { cn } from "@/lib/utils";

/** Foto de la carpeta "Invitación" de Fotos (Google Drive). */
export type PickerPhoto = {
  id: string;
  /** URL directa que se guarda (lh3…=w2000): la tarjeta de WhatsApp no sigue redirecciones. */
  url: string;
  thumb: string;
  label: string;
};

/** Miniatura de una URL guardada: si es de Drive, se pide más pequeña. */
const thumbOf = (url: string) =>
  url.replace(
    /^(https:\/\/lh3\.googleusercontent\.com\/d\/[\w-]+)=w\d+$/,
    "$1=w400",
  );

function PickerDialog({
  open,
  onOpenChange,
  photos,
  multiple,
  selected,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photos: PickerPhoto[];
  multiple: boolean;
  selected: string[];
  onPick: (urls: string[]) => void;
}) {
  const [chosen, setChosen] = useState<string[]>(selected);
  const [url, setUrl] = useState("");
  const toggle = (u: string) => {
    if (!multiple) {
      onPick([u]);
      onOpenChange(false);
      return;
    }
    setChosen((c) => (c.includes(u) ? c.filter((x) => x !== u) : [...c, u]));
  };
  const addUrl = () => {
    const u = url.trim();
    if (!isSafeImageUrl(u)) return;
    setUrl("");
    toggle(u);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {multiple ? "Elegir fotos" : "Elegir una foto"}
          </DialogTitle>
          <DialogDescription>
            Fotos de la carpeta <strong>Invitación</strong> en Fotos. Para
            agregar más, súbelas ahí.
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {photos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Todavía no hay fotos en la carpeta Invitación.{" "}
              <a
                href="/fotos?carpeta=invitacion"
                className="text-primary underline-offset-4 hover:underline"
              >
                Ir a Fotos
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((p) => {
                const on = (multiple ? chosen : selected).includes(p.url);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.url)}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-lg border-2 transition",
                      on
                        ? "border-primary"
                        : "border-transparent hover:border-primary/40",
                    )}
                    title={p.label}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de Google Drive */}
                    <img
                      src={p.thumb}
                      alt={p.label}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                    {on && (
                      <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        {multiple ? (
                          chosen.indexOf(p.url) + 1 || (
                            <Check className="size-3" />
                          )
                        ) : (
                          <Check className="size-3" />
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <div className="mt-4">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link2 className="size-3.5" /> O pega el enlace de una foto
              (https://…)
            </p>
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addUrl())
                }
                placeholder="https://…/foto.jpg"
                aria-label="Enlace de una foto"
              />
              <Button
                type="button"
                variant="outline"
                disabled={!isSafeImageUrl(url.trim())}
                onClick={addUrl}
              >
                Usar
              </Button>
            </div>
          </div>
        </div>
        {multiple && (
          <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">
              {chosen.length} seleccionadas
            </span>
            <Button
              type="button"
              onClick={() => {
                onPick(chosen);
                onOpenChange(false);
              }}
            >
              Listo
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Una foto (portada, Fig. 01, cierre…). */
export function PhotoField({
  value,
  onChange,
  photos,
  disabled,
  framing,
  onFraming,
  aspect,
}: {
  value: string;
  onChange: (url: string) => void;
  photos: PickerPhoto[];
  disabled?: boolean;
  /** Encuadre (zoom y posición); sin `onFraming` no se ofrece ajustarlo. */
  framing?: PhotoFraming;
  onFraming?: (f: PhotoFraming | undefined) => void;
  aspect?: string;
}) {
  const [open, setOpen] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-muted-foreground hover:border-primary"
          aria-label="Elegir foto"
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- miniatura
            <img
              src={thumbOf(value)}
              alt=""
              className="size-full object-cover"
              style={framingStyle(framing)}
            />
          ) : (
            <ImagePlus className="size-5" />
          )}
        </button>
        <div className="flex flex-col items-start gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => setOpen(true)}
          >
            {value ? "Cambiar foto" : "Elegir foto"}
          </Button>
          {value && onFraming && (
            <Button
              type="button"
              variant={adjusting ? "secondary" : "ghost"}
              size="xs"
              disabled={disabled}
              onClick={() => setAdjusting((a) => !a)}
            >
              <Crop className="size-3" />
              {adjusting ? "Listo" : "Ajustar encuadre"}
            </Button>
          )}
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={disabled}
              onClick={() => onChange("")}
            >
              Quitar
            </Button>
          )}
        </div>
        {open && (
          <PickerDialog
            open={open}
            onOpenChange={setOpen}
            photos={photos}
            multiple={false}
            selected={value ? [value] : []}
            onPick={([u]) => onChange(u ?? "")}
          />
        )}
      </div>
      {value && onFraming && adjusting && (
        <FramingEditor
          src={value}
          value={framing}
          onChange={onFraming}
          aspect={aspect}
          disabled={disabled}
        />
      )}
    </div>
  );
}

/** Varias fotos en orden (galería). */
export function PhotosField({
  value,
  onChange,
  photos,
  disabled,
  max = 12,
  framing,
  onFraming,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  photos: PickerPhoto[];
  disabled?: boolean;
  max?: number;
  /** Encuadre de cada foto, por URL. */
  framing?: Framing;
  onFraming?: (url: string, f: PhotoFraming | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const adjustingUrl =
    adjusting && value.includes(adjusting) ? adjusting : null;
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5">
          {value.map((u, i) => (
            <div
              key={u}
              className="group relative aspect-square overflow-hidden rounded-md border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura */}
              <img
                src={thumbOf(u)}
                alt=""
                className="size-full object-cover"
                style={framingStyle(framing?.[u])}
              />
              <span className="absolute bottom-0.5 left-0.5 rounded bg-black/55 px-1 text-[10px] text-white">
                {i + 1}
              </span>
              {!disabled && onFraming && (
                <button
                  type="button"
                  onClick={() => setAdjusting((a) => (a === u ? null : u))}
                  className={cn(
                    "absolute right-0.5 bottom-0.5 flex size-5 items-center justify-center rounded-full text-white",
                    adjustingUrl === u ? "bg-primary" : "bg-black/60",
                  )}
                  aria-label="Ajustar encuadre"
                >
                  <Crop className="size-3" />
                </button>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((x) => x !== u))}
                  className="absolute top-0.5 right-0.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"
                  aria-label="Quitar foto"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {adjustingUrl && onFraming && (
        <FramingEditor
          src={adjustingUrl}
          value={framing?.[adjustingUrl]}
          onChange={(f) => onFraming(adjustingUrl, f)}
          aspect="3 / 4"
          disabled={disabled}
        />
      )}
      {value.length > 0 && onFraming && !adjustingUrl && (
        <p className="text-xs text-muted-foreground">
          Toca el ícono de recorte de una foto para moverla o hacer zoom.
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <ImagePlus className="size-3.5" />
        {value.length ? "Cambiar selección" : "Elegir fotos"}
      </Button>
      {open && (
        <PickerDialog
          open={open}
          onOpenChange={setOpen}
          photos={photos}
          multiple
          selected={value}
          onPick={(urls) => onChange([...new Set(urls)].slice(0, max))}
        />
      )}
    </div>
  );
}
