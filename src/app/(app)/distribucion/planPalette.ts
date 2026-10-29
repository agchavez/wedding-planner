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
