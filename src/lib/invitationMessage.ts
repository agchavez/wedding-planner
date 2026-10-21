/**
 * Enlaces y mensajes de la invitación digital: teléfono para WhatsApp, plantilla del mensaje
 * y estado de envío de cada invitado. Sin dependencias de servidor (cliente, server actions
 * y servidor MCP).
 */

export const DEFAULT_WHATSAPP_TEMPLATE = `Hola {nombre} 💌

Con muchísima ilusión queremos invitarte a celebrar nuestra boda el *{fecha}*.

Abre tu invitación personal aquí 👇
{enlace}

Con cariño,
{pareja}`;

export const TEMPLATE_VARIABLES = [
  { key: "{nombre}", description: "Nombre de pila del invitado" },
  { key: "{nombre_completo}", description: "Nombre completo" },
  { key: "{pareja}", description: "Nombres de la pareja" },
  { key: "{fecha}", description: "Fecha de la boda" },
  { key: "{enlace}", description: "Enlace personal de la invitación" },
  { key: "{lugares}", description: "Lugares reservados (invitado + acompañantes)" },
] as const;

/** Ruta pública de la invitación personal. */
export function invitationPath(token: string) {
  return `/i/${token}`;
}

export function invitationUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, "")}${invitationPath(token)}`;
}

/**
 * Teléfono listo para wa.me: solo dígitos y con código de país. Un número local de 8
 * dígitos (Honduras) recibe `defaultCountryCode`; uno con "+" o "00" se respeta.
 */
export function normalizePhone(raw: string, defaultCountryCode = "504"): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+") || trimmed.startsWith("00");
  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("00")) digits = digits.slice(2);
  if (!digits) return "";
  if (hasPlus) return digits;
  const cc = defaultCountryCode.replace(/\D/g, "");
  if (cc && digits.startsWith(cc) && digits.length > 8) return digits;
  return cc && digits.length <= 10 ? `${cc}${digits}` : digits;
}

export function isValidWhatsappPhone(digits: string) {
  return digits.length >= 8 && digits.length <= 15;
}

/** Enlace de WhatsApp: con teléfono abre ese chat; sin teléfono, el selector de contactos. */
export function whatsappUrl(phoneDigits: string, text: string) {
  const base = phoneDigits ? `https://wa.me/${phoneDigits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

export type MessageContext = {
  fullName: string;
  coupleNames: string;
  dateLabel: string;
  link: string;
  seats: number;
};

export function renderInvitationMessage(template: string, ctx: MessageContext) {
  const source = template.trim() ? template : DEFAULT_WHATSAPP_TEMPLATE;
  const values: Record<string, string> = {
    "{nombre}": firstName(ctx.fullName),
    "{nombre_completo}": ctx.fullName.trim(),
    "{pareja}": ctx.coupleNames,
    "{fecha}": ctx.dateLabel,
    "{enlace}": ctx.link,
    "{lugares}": String(ctx.seats),
  };
  const text = source.replace(/\{[a-z_]+\}/g, (m) => values[m] ?? m);
  // Sin {enlace} en la plantilla, el enlace va al final para que WhatsApp muestre la vista previa.
  return source.includes("{enlace}") ? text : `${text}\n\n${ctx.link}`;
}

export function formatWeddingDate(date: Date | string | null | undefined) {
  if (!date) return "próximamente";
  return new Intl.DateTimeFormat("es-HN", { dateStyle: "long", timeZone: "UTC" }).format(new Date(date));
}

export type InvitationStatus = "not_sent" | "sent" | "opened" | "confirmed" | "declined";

export const INVITATION_STATUS: Record<InvitationStatus, { label: string; className: string }> = {
  not_sent: { label: "Sin enviar", className: "bg-muted text-muted-foreground" },
  sent: { label: "Enviada", className: "bg-sky-100 text-sky-800" },
  opened: { label: "Vista", className: "bg-violet-100 text-violet-800" },
  confirmed: { label: "Confirmó", className: "bg-emerald-100 text-emerald-800" },
  declined: { label: "No asistirá", className: "bg-rose-100 text-rose-800" },
};

/** Estado de la invitación de un invitado según lo que se sabe de él. */
export function invitationStatus(guest: {
  rsvpStatus: string;
  rsvpRespondedAt?: Date | string | null;
  invitationOpenedAt?: Date | string | null;
  invitationSentAt?: Date | string | null;
}): InvitationStatus {
  if (guest.rsvpRespondedAt || guest.rsvpStatus !== "pending") {
    if (guest.rsvpStatus === "confirmed") return "confirmed";
    if (guest.rsvpStatus === "declined") return "declined";
  }
  if (guest.invitationOpenedAt) return "opened";
  if (guest.invitationSentAt) return "sent";
  return "not_sent";
}
