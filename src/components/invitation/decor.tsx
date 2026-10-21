import type { CSSProperties } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

/** Detalles gráficos de la invitación, en SVG para que tomen los colores del tema. */

export function Ornament({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 20" className={cn("h-4 w-48 text-(--inv-gold)", className)} aria-hidden>
      <path d="M0 10 H96" stroke="currentColor" strokeWidth="0.8" />
      <path d="M144 10 H240" stroke="currentColor" strokeWidth="0.8" />
      <path d="M120 2 L128 10 L120 18 L112 10 Z" fill="none" stroke="currentColor" strokeWidth="0.9" />
      <circle cx="120" cy="10" r="2" fill="currentColor" />
      <circle cx="104" cy="10" r="1.3" fill="currentColor" />
      <circle cx="136" cy="10" r="1.3" fill="currentColor" />
    </svg>
  );
}

/** Línea fina con un corazón al centro (como separador de secciones). */
export function HeartDivider({ className }: { className?: string }) {
  return (
    <div className={cn("inv-divider flex items-center justify-center gap-3 text-(--inv-gold)", className)} aria-hidden>
      <span className="inv-line-l h-px w-16 bg-current opacity-70" />
      <Heart className="inv-pop size-2.5" fill="currentColor" strokeWidth={0} style={{ "--i": 2 } as CSSProperties} />
      <span className="inv-line-r h-px w-16 bg-current opacity-70" />
    </div>
  );
}

// Hojas a lo largo de una rama curva: [x, y, rotación, escala].
const LEAVES: [number, number, number, number][] = [
  [26, 168, -35, 1],
  [44, 150, 40, 0.95],
  [52, 128, -50, 1.05],
  [72, 112, 30, 0.9],
  [78, 90, -55, 1],
  [100, 76, 25, 0.85],
  [104, 54, -60, 0.9],
  [126, 44, 20, 0.75],
  [132, 24, -65, 0.7],
];

/** Rama botánica en línea (esquinas y costados de la invitación). */
export function Sprig({ className, flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 160 200"
      className={cn("pointer-events-none text-(--inv-accent)", flip && "-scale-x-100", className)}
      aria-hidden
    >
      {/* pathLength=1: el trazo se anima de 0 a 1 sin conocer su largo real (ver .inv-stem). */}
      <path
        className="inv-stem"
        pathLength={1}
        d="M12 196 C 40 150, 70 110, 148 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        opacity="0.7"
      />
      {LEAVES.map(([x, y, r, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
          <g className="inv-leaf" style={{ "--i": i } as CSSProperties}>
            <path d="M0 0 C 6 -8, 20 -10, 26 0 C 20 10, 6 8, 0 0 Z" fill="currentColor" opacity="0.16" />
            <path d="M0 0 C 6 -8, 20 -10, 26 0 C 20 10, 6 8, 0 0 Z" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.65" />
            <path d="M0 0 L 22 0" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
          </g>
        </g>
      ))}
    </svg>
  );
}

// Perfil irregular de papel rasgado (fijo: igual en servidor y cliente).
const TORN =
  "M0 9 L7.6 6.4 L13.2 6.3 L16.5 10.6 L20.1 8.5 L24.0 7.3 L33.6 9.5 L43.4 6.3 L48.4 8.9 L53.6 10.9 L60.7 9.8 L67.5 8.4 L71.9 10.1 L77.1 9.5 L82.2 10.8 L86.9 9.4 L96 10.4 L105.9 6.7 L114.2 6.9 L117.5 10.0 L124.5 11.3 L132.4 9.6 L138.6 11.0 L144.9 12.0 L152.8 9.9 L161.6 7.7 L169.3 6.1 L173.5 8.7 L181.9 6.8 L187.6 13.2 L193.7 9.3 L202.4 11.2 L208.3 8.2 L218 6.9 L222.6 7.4 L229.7 9.6 L235.6 8.2 L245.3 10.1 L252.6 12.1 L261.9 10.7 L270.5 8.4 L274.2 11.8 L277.7 7.3 L283.1 8.3 L287.2 6.6 L290.4 11.2 L294.4 7.5 L299.9 6.7 L309.9 8.8 L313.5 6.6 L318.4 11.0 L321.6 11.7 L325.6 11.3 L332.3 11.9 L340.2 7.6 L344.4 10.6 L352.9 8.0 L361.6 11.9 L370.2 10.9 L374.8 9.1 L378 6.2 L382.8 10.2 L388.9 11.6 L398.6 8.2 L400 9";

/** Borde de papel rasgado; `side="top"` va encima de una franja de color, `bottom` debajo. */
export function TornEdge({ side, className }: { side: "top" | "bottom"; className?: string }) {
  return (
    <svg
      viewBox="0 0 400 16"
      preserveAspectRatio="none"
      className={cn("block h-4 w-full text-(--inv-band)", side === "bottom" && "rotate-180", className)}
      aria-hidden
    >
      <path d={`${TORN} L400 16 L0 16 Z`} fill="currentColor" />
    </svg>
  );
}
