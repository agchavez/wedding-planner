"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * Colores del plano (estilo "Papel y lino"). Konva dibuja en un <canvas> y no entiende variables
 * CSS, así que se leen de los tokens --plan-* de globals.css (que a su vez usan los del tema de la
 * app: --primary, --foreground...) y se vuelven a leer si cambia el tema o el modo oscuro.
 */
export type PlanPalette = {
  canvas: string;
  floor: string;
  floorGarden: string;
  wall: string;
  pista: string;
  tarima: string;
  zone: string;
  zoneLine: string;
  table: string;
  tableLine: string;
  chair: string;
  ink: string;
  muted: string;
  accent: string;
  onAccent: string;
  /** Colores de las sillas ocupadas: g1…g6 por lado/grupo, gNone sin lado ni grupo. */
  g1: string;
  g2: string;
  g3: string;
  g4: string;
  g5: string;
  g6: string;
  gNone: string;
  onSeat: string;
  /** Avisos (mesa pasada de capacidad, no cabe al soltar). */
  bad: string;
  displayFont: string;
  bodyFont: string;
};

// Valores de respaldo (tema "blush" claro), por si el CSS aún no cargó.
const FALLBACK: PlanPalette = {
  canvas: "#efe4d6",
  floor: "#fdf8f1",
  floorGarden: "#eef2e2",
  wall: "#4a3524",
  pista: "#f0e1cc",
  tarima: "#ead6c3",
  zone: "#f6ede2",
  zoneLine: "#d6bfa6",
  table: "#ffffff",
  tableLine: "#d9c4b0",
  chair: "#f1e5d8",
  ink: "#3b2a2a",
  muted: "#8a746d",
  accent: "#a8415c",
  onAccent: "#fff8f5",
  g1: "#a8415c",
  g2: "#5c7863",
  g3: "#8a6a2f",
  g4: "#5f6a94",
  g5: "#a5573b",
  g6: "#7d5a86",
  gNone: "#7a6b62",
  onSeat: "#ffffff",
  bad: "#c0392b",
  displayFont: "Georgia, serif",
  bodyFont: "system-ui, sans-serif",
};

const TOKENS: Record<keyof PlanPalette, string> = {
  canvas: "--plan-canvas",
  floor: "--plan-floor",
  floorGarden: "--plan-floor-garden",
  wall: "--plan-wall",
  pista: "--plan-pista",
  tarima: "--plan-tarima",
  zone: "--plan-zone",
  zoneLine: "--plan-zone-line",
  table: "--plan-table",
  tableLine: "--plan-table-line",
  chair: "--plan-chair",
  ink: "--plan-ink",
  muted: "--plan-muted",
  accent: "--plan-accent",
  onAccent: "--plan-on-accent",
  g1: "--plan-g1",
  g2: "--plan-g2",
  g3: "--plan-g3",
  g4: "--plan-g4",
  g5: "--plan-g5",
  g6: "--plan-g6",
  gNone: "--plan-g-none",
  onSeat: "--plan-on-seat",
  bad: "--destructive",
  displayFont: "--font-playfair",
  bodyFont: "--font-sans",
};

function readPalette(): PlanPalette {
  if (typeof document === "undefined") return FALLBACK;
  const style = getComputedStyle(document.documentElement);
  const palette = { ...FALLBACK };
  for (const key of Object.keys(TOKENS) as (keyof PlanPalette)[]) {
    const value = style.getPropertyValue(TOKENS[key]).trim();
    if (value) palette[key] = value;
  }
  return palette;
}

/** Color de silla ocupada para un índice de seatColorSlot (null = sin lado ni grupo). */
export function seatColor(palette: PlanPalette, slot: number | null): string {
  if (slot === null) return palette.gNone;
  return [palette.g1, palette.g2, palette.g3, palette.g4, palette.g5, palette.g6][slot] ?? palette.gNone;
}

/** El mismo color como variable CSS, para el panel de invitados (HTML). */
export function seatColorVar(slot: number | null): string {
  return slot === null ? "var(--plan-g-none)" : `var(--plan-g${slot + 1})`;
}

/** Paleta del plano; se actualiza al cambiar el tema, los colores propios o la clase .dark. */
export function usePlanPalette(): PlanPalette {
  const [palette, setPalette] = useState(readPalette);
  useEffect(() => {
    const observer = new MutationObserver(() => setPalette(readPalette()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    return () => observer.disconnect();
  }, []);
  return palette;
}

/** Texturas del plano (piso de lino, parqué de la pista, tarima rayada) como lienzos repetibles. */
export type PlanPatterns = {
  linen: HTMLCanvasElement | null;
  parquet: HTMLCanvasElement | null;
  hatch: HTMLCanvasElement | null;
};

function tile(size: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  draw(ctx);
  return canvas;
}

function makePatterns(p: PlanPalette, floor: string): PlanPatterns {
  if (typeof document === "undefined") return { linen: null, parquet: null, hatch: null };
  return {
    // Trama de lino: cuadrícula muy fina sobre el color del piso.
    linen: tile(6, (ctx) => {
      ctx.fillStyle = floor;
      ctx.fillRect(0, 0, 6, 6);
      ctx.strokeStyle = p.zoneLine;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, 3);
      ctx.lineTo(6, 3);
      ctx.moveTo(3, 0);
      ctx.lineTo(3, 6);
      ctx.stroke();
    }),
    // Parqué: tablas alternadas en vertical y horizontal.
    parquet: tile(20, (ctx) => {
      ctx.fillStyle = p.pista;
      ctx.fillRect(0, 0, 20, 20);
      ctx.fillStyle = p.zoneLine;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(0, 0, 10, 20);
      ctx.fillRect(10, 0, 10, 10);
    }),
    // Tarima: rayas diagonales a 45°.
    hatch: tile(8, (ctx) => {
      ctx.fillStyle = p.tarima;
      ctx.fillRect(0, 0, 8, 8);
      ctx.strokeStyle = p.zoneLine;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-2, 2);
      ctx.lineTo(2, -2);
      ctx.moveTo(0, 8);
      ctx.lineTo(8, 0);
      ctx.moveTo(6, 10);
      ctx.lineTo(10, 6);
      ctx.stroke();
    }),
  };
}

export function usePlanPatterns(palette: PlanPalette, floor: string): PlanPatterns {
  return useMemo(() => makePatterns(palette, floor), [palette, floor]);
}

export type PlanTheme = { palette: PlanPalette; patterns: PlanPatterns };

/**
 * Se provee dentro del <Stage> (el reconciliador de Konva no hereda los contextos de afuera
 * en todas las versiones), así las figuras no necesitan recibir la paleta por props.
 */
export const PlanThemeContext = createContext<PlanTheme>({
  palette: FALLBACK,
  patterns: { linen: null, parquet: null, hatch: null },
});

export function usePlanTheme() {
  return useContext(PlanThemeContext);
}
