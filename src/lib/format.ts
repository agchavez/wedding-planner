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
