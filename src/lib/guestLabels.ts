/**
 * Lado del invitado y colores de etiquetas. Sin dependencias de servidor, para usarlo igual
 * en el cliente, en las server actions y en el servidor MCP.
 */

export type GuestSide = "bride" | "groom" | "both" | "";

export const GUEST_SIDES: { value: Exclude<GuestSide, "">; label: string; short: string }[] = [
  { value: "bride", label: "Invitados de la novia", short: "Novia" },
  { value: "groom", label: "Invitados del novio", short: "Novio" },
  { value: "both", label: "De ambos", short: "Ambos" },
];

export const SIDE_LABEL: Record<string, string> = {
  bride: "Novia",
  groom: "Novio",
  both: "Ambos",
  "": "Sin lado",
};

export function parseSide(raw: unknown): GuestSide {
  return raw === "bride" || raw === "groom" || raw === "both" ? raw : "";
}

/** Paleta de etiquetas: clases para el chip y un color sólido para el punto. */
export const LABEL_COLORS = {
  rose: { name: "Rosa", chip: "bg-rose-100 text-rose-800 ring-rose-200", dot: "#e11d48" },
  amber: { name: "Ámbar", chip: "bg-amber-100 text-amber-900 ring-amber-200", dot: "#d97706" },
  emerald: { name: "Verde", chip: "bg-emerald-100 text-emerald-800 ring-emerald-200", dot: "#059669" },
  sky: { name: "Celeste", chip: "bg-sky-100 text-sky-800 ring-sky-200", dot: "#0284c7" },
  violet: { name: "Violeta", chip: "bg-violet-100 text-violet-800 ring-violet-200", dot: "#7c3aed" },
  slate: { name: "Gris", chip: "bg-slate-100 text-slate-700 ring-slate-200", dot: "#475569" },
  orange: { name: "Naranja", chip: "bg-orange-100 text-orange-800 ring-orange-200", dot: "#ea580c" },
  teal: { name: "Turquesa", chip: "bg-teal-100 text-teal-800 ring-teal-200", dot: "#0d9488" },
} as const;

export type LabelColor = keyof typeof LABEL_COLORS;

export function isLabelColor(value: unknown): value is LabelColor {
  return typeof value === "string" && value in LABEL_COLORS;
}

export function labelColor(value: string) {
  return LABEL_COLORS[isLabelColor(value) ? value : "slate"];
}

export type LabelOption = { id: string; name: string; color: string };
