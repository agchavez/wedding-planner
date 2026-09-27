const TZ = "America/Tegucigalpa";
const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
const dateTime = new Intl.DateTimeFormat("es-HN", { dateStyle: "medium", timeStyle: "short", timeZone: TZ });
const dateOnly = new Intl.DateTimeFormat("es-HN", { dateStyle: "medium", timeZone: TZ });

/** "hace 5 minutos", "ayer", "hace 3 días". */
export function relativeTime(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return "Nunca";
  const diff = (new Date(iso).getTime() - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return "ahora mismo";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return dateOnly.format(new Date(iso));
}

export function formatDateTime(iso: string) {
  return dateTime.format(new Date(iso));
}

export function formatDate(iso: string) {
  return dateOnly.format(new Date(iso));
}

export function formatMoney(amount: number, currency = "HNL") {
  return new Intl.NumberFormat("es-HN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

/** Días que faltan para una fecha (negativo si ya pasó); null si no hay fecha. */
export function daysUntil(iso: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

/**
 * Convierte "AAAA-MM-DD" (fecha sin hora) en un Date a mediodía UTC, para que el día se
 * muestre igual en cualquier zona horaria de América (medianoche UTC en Honduras es el
 * día anterior).
 */
export function parseDateOnly(value: FormDataEntryValue | null | undefined): Date | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return new Date(`${raw}T12:00:00Z`);
}

/** Inversa de parseDateOnly: Date guardado → "AAAA-MM-DD" (en UTC, sin corrimiento). */
export function toDateOnlyValue(date: Date | string | null | undefined) {
  return date ? new Date(date).toISOString().slice(0, 10) : "";
}

const calendarFormats = {
  medium: new Intl.DateTimeFormat("es-HN", { dateStyle: "medium", timeZone: "UTC" }),
  full: new Intl.DateTimeFormat("es-HN", { dateStyle: "full", timeZone: "UTC" }),
};

/** Fechas sin hora (boda, vencimientos): se leen en UTC para no correrse de día. */
export function formatCalendarDate(date: Date | string, style: "medium" | "full" = "medium") {
  return calendarFormats[style].format(new Date(date));
}
