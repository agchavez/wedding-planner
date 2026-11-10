"use client";

import { useRef } from "react";
import { Move, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_FRAMING, framingStyle, type PhotoFraming } from "@/lib/invitationBlocks";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round = (n: number) => Math.round(n * 100) / 100;

/** Versión liviana de una foto de Drive para la vista del editor. */
const previewOf = (url: string) => url.replace(/^(https:\/\/lh3\.googleusercontent\.com\/d\/[\w-]+)=w\d+$/, "$1=w900");

/**
 * Ajuste de encuadre de una foto: se arrastra (mouse o dedo) para moverla y se acerca o aleja con
 * el control de zoom. El cambio se ve en vivo en la invitación.
 */
export function FramingEditor({
  src,
  value,
  onChange,
  aspect = "4 / 5",
  disabled,
}: {
  src: string;
  value: PhotoFraming | undefined;
  onChange: (framing: PhotoFraming | undefined) => void;
  /** Proporción del recuadro de vista previa (aprox. la del lugar donde va la foto). */
  aspect?: string;
  disabled?: boolean;
}) {
  const f = value ?? DEFAULT_FRAMING;
  const drag = useRef<{ x: number; y: number; start: PhotoFraming; w: number; h: number } | null>(null);

  function set(next: Partial<PhotoFraming>) {
    const merged = { ...f, ...next };
    const out = { x: round(clamp(merged.x, 0, 100)), y: round(clamp(merged.y, 0, 100)), z: round(clamp(merged.z, 1, 3)) };
    const isDefault = out.x === 50 && out.y === 50 && out.z === 1;
    onChange(isDefault ? undefined : out);
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-2.5">
      <div
        role="slider"
        aria-label="Mover la foto"
        aria-valuenow={Math.round(f.x)}
        aria-valuetext={`Horizontal ${Math.round(f.x)}%, vertical ${Math.round(f.y)}%`}
        tabIndex={disabled ? -1 : 0}
        className="relative mx-auto w-full max-w-[220px] cursor-grab touch-none overflow-hidden rounded-md bg-muted outline-none select-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring"
        style={{ aspectRatio: aspect }}
        onPointerDown={(e) => {
          if (disabled) return;
          const r = e.currentTarget.getBoundingClientRect();
          drag.current = { x: e.clientX, y: e.clientY, start: f, w: r.width, h: r.height };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          // Arrastrar a la derecha muestra más de la izquierda de la foto (el punto de enfoque baja).
          const k = 1.6 / d.start.z;
          set({ x: d.start.x - ((e.clientX - d.x) / d.w) * 100 * k, y: d.start.y - ((e.clientY - d.y) / d.h) * 100 * k });
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 10 : 2;
          const moves: Record<string, Partial<PhotoFraming>> = {
            ArrowLeft: { x: f.x + step },
            ArrowRight: { x: f.x - step },
            ArrowUp: { y: f.y + step },
            ArrowDown: { y: f.y - step },
            "+": { z: f.z + 0.1 },
            "-": { z: f.z - 0.1 },
          };
          if (moves[e.key]) {
            e.preventDefault();
            set(moves[e.key]);
          }
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- vista del encuadre */}
        <img src={previewOf(src)} alt="" draggable={false} className="pointer-events-none size-full object-cover" style={framingStyle(f)} />
        <span className="pointer-events-none absolute inset-x-0 bottom-1.5 flex justify-center">
          <span className="flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-white">
            <Move className="size-3" /> Arrastra para mover
          </span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || f.z <= 1}
          onClick={() => set({ z: f.z - 0.1 })}
          className="text-muted-foreground disabled:opacity-40"
          aria-label="Alejar"
        >
          <ZoomOut className="size-4" />
        </button>
        <input
          type="range"
          min={1}
          max={3}
          step={0.02}
          value={f.z}
          disabled={disabled}
          onChange={(e) => set({ z: Number(e.target.value) })}
          aria-label="Zoom"
          className="h-1.5 flex-1 cursor-pointer accent-primary"
        />
        <button
          type="button"
          disabled={disabled || f.z >= 3}
          onClick={() => set({ z: f.z + 0.1 })}
          className="text-muted-foreground disabled:opacity-40"
          aria-label="Acercar"
        >
          <ZoomIn className="size-4" />
        </button>
        <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{Math.round(f.z * 100)}%</span>
      </div>
      <Button type="button" variant="ghost" size="xs" disabled={disabled || !value} onClick={() => onChange(undefined)}>
        <RotateCcw className="size-3" />
        Restablecer
      </Button>
    </div>
  );
}
