"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ITINERARY_ICONS, type ItineraryEntry } from "@/lib/invitationThemes";
import { cn } from "@/lib/utils";

/** Editores de listas de la invitación: programa del día, paleta de vestimenta y galería. */

const SUGGESTED_ITINERARY: ItineraryEntry[] = [
  { time: "4:00 pm", title: "Ceremonia", icon: "church" },
  { time: "5:30 pm", title: "Cóctel de bienvenida", icon: "cheers" },
  { time: "7:00 pm", title: "Primer baile", icon: "dance" },
  { time: "8:00 pm", title: "Cena", icon: "dinner" },
  { time: "9:30 pm", title: "¡Fiesta!", icon: "party" },
];

export function ItineraryEditor({
  value,
  onChange,
  disabled,
}: {
  value: ItineraryEntry[];
  onChange: (next: ItineraryEntry[]) => void;
  disabled?: boolean;
}) {
  function update(i: number, patch: Partial<ItineraryEntry>) {
    onChange(value.map((item, j) => (j === i ? { ...item, ...patch } : item)));
  }
  function move(i: number, dir: -1 | 1) {
    const next = [...value];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
          Agrega los momentos del día (ceremonia, cóctel, cena…). Cada uno lleva un ícono.
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onChange(SUGGESTED_ITINERARY)}>
            Usar un programa sugerido
          </Button>
        </div>
      )}
      {value.map((item, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 sm:flex-nowrap">
          <Select value={item.icon} onValueChange={(icon) => update(i, { icon: String(icon) })} disabled={disabled}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue>{(v: string) => ITINERARY_ICONS[v] ?? v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ITINERARY_ICONS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={item.time}
            onChange={(e) => update(i, { time: e.target.value })}
            placeholder="5:00 pm"
            aria-label="Hora"
            disabled={disabled}
            className="w-24"
          />
          <Input
            value={item.title}
            onChange={(e) => update(i, { title: e.target.value })}
            placeholder="Cóctel de bienvenida"
            aria-label="Momento"
            disabled={disabled}
            className="min-w-0 flex-1"
          />
          <div className="flex">
            <Button type="button" variant="ghost" size="icon-sm" disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label="Subir">
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled || i === value.length - 1}
              onClick={() => move(i, 1)}
              aria-label="Bajar"
            >
              <ArrowDown className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              aria-label="Quitar"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}
      {value.length > 0 && value.length < 15 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange([...value, { time: "", title: "", icon: "heart" }])}
        >
          <Plus className="size-3.5" />
          Agregar momento
        </Button>
      )}
    </div>
  );
}

const PALETTE_PRESETS: { name: string; colors: string[] }[] = [
  { name: "Olivo", colors: ["#efe9dc", "#c9c3a6", "#8b8f6a", "#a88f74", "#3e4230"] },
  { name: "Terracota", colors: ["#f2e3d3", "#d9a37e", "#b5643c", "#7a3e22", "#3b2a20"] },
  { name: "Rosa", colors: ["#f6dfe0", "#e8b9bf", "#b36a7d", "#7a2f45"] },
  { name: "Gala", colors: ["#111013", "#3a3530", "#d6b46a", "#7a1f2b"] },
  { name: "Azul", colors: ["#e3e8ef", "#a9b8cc", "#5b7290", "#22344d"] },
];

export function PaletteEditor({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {value.map((c, i) => (
          <div key={i} className="group relative">
            <input
              type="color"
              value={c}
              disabled={disabled}
              onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))}
              className="size-10 cursor-pointer rounded-full border border-border bg-transparent p-0.5 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch-wrapper]:p-0"
              aria-label={`Color ${i + 1}`}
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 hidden size-4 items-center justify-center rounded-full bg-foreground text-background group-hover:flex"
                aria-label="Quitar color"
              >
                <X className="size-2.5" />
              </button>
            )}
          </div>
        ))}
        {value.length < 6 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange([...value, "#c9c3a6"])}
            className="flex size-10 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
            aria-label="Agregar color"
          >
            <Plus className="size-4" />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PALETTE_PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p.colors)}
            className="flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary"
          >
            <span className="flex -space-x-1">
              {p.colors.map((c) => (
                <span key={c} className="size-3 rounded-full ring-1 ring-card" style={{ background: c }} />
              ))}
            </span>
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GalleryEditor({
  value,
  onChange,
  suggestions,
  disabled,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
  disabled?: boolean;
}) {
  const [url, setUrl] = useState("");
  const add = (u: string) => {
    if (!u || value.includes(u) || value.length >= 8) return;
    onChange([...value, u]);
  };

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((u) => (
            <div key={u} className="group relative h-16 w-20 overflow-hidden rounded-md border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura */}
              <img src={u} alt="" className="size-full object-cover" />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((x) => x !== u))}
                  className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"
                  aria-label="Quitar foto"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…/foto.jpg"
          aria-label="Enlace de una foto"
          disabled={disabled || value.length >= 8}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || !/^https?:\/\//i.test(url) || value.length >= 8}
          onClick={() => {
            add(url.trim());
            setUrl("");
          }}
        >
          Agregar
        </Button>
      </div>
      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">O usa fotos de ejemplo para probar:</p>
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((u) => (
            <button
              key={u}
              type="button"
              disabled={disabled || value.includes(u) || value.length >= 8}
              onClick={() => add(u)}
              className={cn("h-10 w-14 overflow-hidden rounded-md border border-border", value.includes(u) && "opacity-30")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura local */}
              <img src={u} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
