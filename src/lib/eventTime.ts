/**
 * Horas de la boda (ceremonia, recepción). Se muestran siempre en la zona del evento, no en
 * la del navegador de quien abre la invitación; Honduras no tiene horario de verano.
 */

export const EVENT_TIME_ZONE = "America/Tegucigalpa";
const EVENT_UTC_OFFSET = "-06:00";

/** "2027-02-14T16:30" (input datetime-local, hora del evento) → Date. */
export function parseEventDateTime(raw: unknown): Date | null {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}:00${EVENT_UTC_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Date → valor para un input datetime-local, en la hora del evento. */
export function toEventDateTimeValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(date));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function formatEventTime(date: Date | string | null | undefined) {
  if (!date) return "";
  return new Intl.DateTimeFormat("es-HN", { timeZone: EVENT_TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(
    new Date(date)
  );
}

export function formatEventDay(date: Date | string | null | undefined, opts: { utc?: boolean } = {}) {
  if (!date) return "";
  return new Intl.DateTimeFormat("es-HN", {
    timeZone: opts.utc ? "UTC" : EVENT_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}
