/**
 * Temas de la invitación digital. Los colores son hex (no variables CSS) porque se usan
 * igual en la página pública y en la imagen de vista previa (opengraph-image), que se
 * renderiza fuera del navegador.
 */

export type InvitationTheme = {
  name: string;
  description: string;
  /** Fondo general de la página. */
  background: string;
  /** Fondo de las tarjetas / papel de la invitación. */
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  /** Color del detalle dorado (líneas, monograma). */
  gold: string;
  /** Sobre (pantalla de apertura). */
  envelope: string;
  envelopeFlap: string;
  seal: string;
  sealInk: string;
};

export const INVITATION_THEMES = {
  classic: {
    name: "Clásica",
    description: "Marfil y dorado, atemporal",
    background: "#f6efe6",
    paper: "#fffbf5",
    ink: "#3a2e26",
    muted: "#8c7a6b",
    accent: "#9c6b3f",
    gold: "#c2a26b",
    envelope: "#efe2cf",
    envelopeFlap: "#e6d4bb",
    seal: "#8f2f3c",
    sealInk: "#f7e7d3",
  },
  garden: {
    name: "Jardín",
    description: "Salvia y crema, al aire libre",
    background: "#eef0e6",
    paper: "#fbfaf4",
    ink: "#2f3a2c",
    muted: "#748069",
    accent: "#5d7553",
    gold: "#b8a274",
    envelope: "#dfe4d2",
    envelopeFlap: "#d3dac2",
    seal: "#5d7553",
    sealInk: "#f1f3e8",
  },
  blush: {
    name: "Rubor",
    description: "Rosa empolvado y vino",
    background: "#f8ece9",
    paper: "#fffaf8",
    ink: "#45282f",
    muted: "#9a7a7f",
    accent: "#a8415c",
    gold: "#c9a876",
    envelope: "#f2dcd8",
    envelopeFlap: "#ebcdc8",
    seal: "#a8415c",
    sealInk: "#fff1f2",
  },
  noir: {
    name: "Noche",
    description: "Negro profundo y oro, de gala",
    background: "#111013",
    paper: "#1a191d",
    ink: "#f3ead8",
    muted: "#a59c8b",
    accent: "#d6b46a",
    gold: "#d6b46a",
    envelope: "#232127",
    envelopeFlap: "#2c2930",
    seal: "#d6b46a",
    sealInk: "#1a191d",
  },
} satisfies Record<string, InvitationTheme>;

export type InvitationThemeName = keyof typeof INVITATION_THEMES;

export function isInvitationTheme(value: unknown): value is InvitationThemeName {
  return typeof value === "string" && value in INVITATION_THEMES;
}

export function invitationTheme(name: string): InvitationTheme {
  return INVITATION_THEMES[isInvitationTheme(name) ? name : "classic"];
}

/** Iniciales para el monograma: "Ana" + "Luis" → "A & L". */
export function monogram(partner1: string, partner2: string) {
  const a = partner1.trim()[0]?.toUpperCase() ?? "";
  const b = partner2.trim()[0]?.toUpperCase() ?? "";
  return a && b ? `${a} & ${b}` : a || b || "♥";
}
