import type { InvitationData } from "@/lib/guestInvitations";

const EVENT_HOURS = 6;

function stamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function dayStamp(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

/** Inicio/fin del evento: con hora si hay ceremonia o recepción, si no, día completo. */
export function eventRange(data: InvitationData) {
  const timed = data.ceremonyTime ?? data.receptionTime;
  if (timed) {
    const start = new Date(timed);
    return { allDay: false, start, end: new Date(start.getTime() + EVENT_HOURS * 3_600_000) };
  }
  if (!data.weddingDate) return null;
  const start = new Date(data.weddingDate);
  return { allDay: true, start, end: new Date(start.getTime() + 86_400_000) };
}

export function eventTitle(data: InvitationData) {
  const names = [data.partner1, data.partner2].filter(Boolean).join(" & ");
  return names ? `Boda de ${names}` : "Boda";
}

export function eventLocation(data: InvitationData) {
  const place = data.ceremonyPlace || data.receptionPlace || data.venueName;
  const address = data.ceremonyAddress || data.receptionAddress || data.venueAddress;
  return [place, address].filter(Boolean).join(", ");
}

/** Enlaces "Agregar al calendario" (Google y archivo .ics para Apple/Outlook). */
export function calendarLinks(data: InvitationData, token?: string) {
  const range = eventRange(data);
  if (!range) return null;
  const dates = range.allDay
    ? `${dayStamp(range.start)}/${dayStamp(range.end)}`
    : `${stamp(range.start)}/${stamp(range.end)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: eventTitle(data),
    dates,
    location: eventLocation(data),
    details: "¡Te esperamos!",
  });
  return {
    google: `https://calendar.google.com/calendar/render?${params.toString()}`,
    ics: token ? `/i/${token}/calendario` : null,
  };
}

export function buildIcs(data: InvitationData, url: string) {
  const range = eventRange(data);
  if (!range) return null;
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
  const dt = range.allDay
    ? [`DTSTART;VALUE=DATE:${dayStamp(range.start)}`, `DTEND;VALUE=DATE:${dayStamp(range.end)}`]
    : [`DTSTART:${stamp(range.start)}`, `DTEND:${stamp(range.end)}`];
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wedplan//Invitacion//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${stamp(range.start)}-${url.split("/").pop()}@wedplan`,
    `DTSTAMP:${stamp(new Date())}`,
    ...dt,
    `SUMMARY:${esc(eventTitle(data))}`,
    `LOCATION:${esc(eventLocation(data))}`,
    `DESCRIPTION:${esc(`Tu invitación: ${url}`)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(eventTitle(data))}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
