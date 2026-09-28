import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { CalendarHeart, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId, weddingDisplayName } from "@/lib/wedding";
import { formatCalendarDate, plural } from "@/lib/format";
import { TIMELINE_CATEGORY_LABEL } from "@/app/(app)/linea-tiempo/categories";
import { BrandMark } from "@/components/BrandMark";
import { PrintToolbar } from "./PrintToolbar";

export const metadata: Metadata = { title: "Línea de tiempo · Wedplan" };

// Las horas se guardan con la zona del servidor (Honduras); se muestran siempre en esa zona.
const TIME = new Intl.DateTimeFormat("es-HN", { hour: "numeric", minute: "2-digit", timeZone: "America/Tegucigalpa" });
const PRINTED_AT = new Intl.DateTimeFormat("es-HN", { dateStyle: "long", timeStyle: "short", timeZone: "America/Tegucigalpa" });

// Colores fijos (no del tema) para que se lean igual en papel.
const CATEGORY_DOT: Record<string, string> = {
  preparation: "#0284c7",
  ceremony: "#7c3aed",
  reception: "#d97706",
  party: "#e11d48",
};

function formatDuration(minutes: number) {
  if (minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h && `${h} h`, m && `${m} min`].filter(Boolean).join(" ");
}

/** Hoja imprimible (A4) de la línea de tiempo de un evento: para proveedores, familia y coordinación. */
export default async function PrintTimelinePage({ params }: PageProps<"/imprimir/linea-tiempo/[eventId]">) {
  const { eventId } = await params;
  if (!ObjectId.isValid(eventId)) notFound();

  const weddingId = await getActiveWeddingId();
  const event = await prisma.weddingEvent.findFirst({ where: { id: eventId, weddingId } });
  if (!event) notFound();

  const [wedding, items] = await Promise.all([
    prisma.wedding.findUniqueOrThrow({ where: { id: weddingId } }),
    prisma.timelineEvent.findMany({ where: { weddingId, eventId }, orderBy: { sortOrder: "asc" } }),
  ]);

  const rows = items.map((item) => {
    const start = item.startTime ? new Date(item.startTime) : null;
    const end = start && item.durationMinutes > 0 ? new Date(start.getTime() + item.durationMinutes * 60_000) : null;
    return { ...item, start, end };
  });
  const timed = rows.filter((r) => r.start);
  const dayStart = timed.length ? new Date(Math.min(...timed.map((r) => r.start!.getTime()))) : null;
  const dayEnd = timed.length ? new Date(Math.max(...timed.map((r) => (r.end ?? r.start)!.getTime()))) : null;
  const categories = [...new Set(items.map((i) => i.category).filter((c): c is string => Boolean(c)))];

  return (
    <div className="min-h-svh bg-muted/40 print:bg-white">
      <style>{`@page { size: A4 portrait; margin: 14mm 14mm 16mm; }`}</style>
      <PrintToolbar backHref="/linea-tiempo" />

      <article className="mx-auto my-6 w-full max-w-[210mm] bg-white px-[14mm] py-[14mm] text-neutral-900 shadow-sm print:my-0 print:max-w-none print:p-0 print:shadow-none">
        {/* Encabezado */}
        <header className="border-b-2 border-[#c9a876] pb-6 text-center">
          <p className="text-[10px] font-semibold tracking-[0.3em] text-[#a8415c] uppercase">Línea de tiempo</p>
          <h1 className="mt-2 font-heading text-4xl font-semibold text-neutral-900">{event.name}</h1>
          <p className="mt-2 font-heading text-xl text-[#a8415c] italic">{weddingDisplayName(wedding, "")}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-neutral-600">
            {wedding.weddingDate && (
              <span className="flex items-center gap-1.5">
                <CalendarHeart className="size-4 text-[#c9a876]" />
                {formatCalendarDate(wedding.weddingDate, "full")}
              </span>
            )}
            {(wedding.venueName || wedding.venueAddress) && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4 text-[#c9a876]" />
                {[wedding.venueName, wedding.venueAddress].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
        </header>

        {/* Resumen */}
        {items.length > 0 && (
          <dl className="mt-5 grid grid-cols-3 divide-x divide-neutral-200 rounded-lg border border-neutral-200 text-center">
            <div className="px-3 py-2.5">
              <dt className="text-[10px] tracking-wider text-neutral-500 uppercase">Inicio</dt>
              <dd className="font-heading text-lg font-semibold tabular-nums">{dayStart ? TIME.format(dayStart) : "—"}</dd>
            </div>
            <div className="px-3 py-2.5">
              <dt className="text-[10px] tracking-wider text-neutral-500 uppercase">Cierre estimado</dt>
              <dd className="font-heading text-lg font-semibold tabular-nums">{dayEnd ? TIME.format(dayEnd) : "—"}</dd>
            </div>
            <div className="px-3 py-2.5">
              <dt className="text-[10px] tracking-wider text-neutral-500 uppercase">Momentos</dt>
              <dd className="font-heading text-lg font-semibold tabular-nums">{items.length}</dd>
            </div>
          </dl>
        )}

        {/* Momentos */}
        {rows.length === 0 ? (
          <p className="mt-10 text-center text-sm text-neutral-500">Este evento todavía no tiene momentos.</p>
        ) : (
          <ol className="mt-6">
            {rows.map((row, i) => {
              const color = (row.category && CATEGORY_DOT[row.category]) || "#a3a3a3";
              const duration = formatDuration(row.durationMinutes);
              return (
                <li key={row.id} className="grid break-inside-avoid grid-cols-[5.5rem_1.5rem_1fr_1.25rem] gap-x-2">
                  <div className="pt-0.5 text-right">
                    <p className="font-heading text-base leading-tight font-semibold tabular-nums">
                      {row.start ? TIME.format(row.start) : "—"}
                    </p>
                    {row.end && <p className="text-[11px] text-neutral-500 tabular-nums">a {TIME.format(row.end)}</p>}
                  </div>
                  <div className="relative flex justify-center">
                    <span className="relative z-10 mt-1.5 size-3 rounded-full ring-4 ring-white" style={{ backgroundColor: color }} />
                    {i < rows.length - 1 && <span className="absolute top-3 bottom-0 w-px bg-neutral-300" />}
                  </div>
                  <div className="pb-5">
                    <p className="font-medium leading-snug">{row.title}</p>
                    <p className="mt-0.5 text-[11px] text-neutral-500">
                      {[row.category && TIMELINE_CATEGORY_LABEL[row.category], duration].filter(Boolean).join(" · ")}
                    </p>
                    {row.description && (
                      <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-neutral-700">{row.description}</p>
                    )}
                  </div>
                  {/* Casilla para ir marcando el día de la boda. */}
                  <span aria-hidden="true" className="mt-1 size-3.5 rounded-[3px] border border-neutral-400" />
                </li>
              );
            })}
          </ol>
        )}

        {/* Espacio para anotar a mano el día de la boda */}
        <section className="mt-2 break-inside-avoid rounded-lg border border-neutral-200 px-4 pt-3 pb-1">
          <p className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">Notas</p>
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="h-7 border-b border-dashed border-neutral-300 last:border-b-0" />
          ))}
        </section>

        {/* Leyenda y pie */}
        <footer className="mt-4 flex break-inside-avoid flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-3 text-[11px] text-neutral-500">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {categories.map((c) => (
              <span key={c} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: CATEGORY_DOT[c] ?? "#a3a3a3" }} />
                {TIMELINE_CATEGORY_LABEL[c] ?? c}
              </span>
            ))}
            {items.length > 0 && <span>{plural(items.length, "momento")} · horas aproximadas</span>}
          </div>
          <span className="flex items-center gap-1.5">
            <BrandMark className="size-3.5" />
            Wedplan · {PRINTED_AT.format(new Date())}
          </span>
        </footer>
      </article>
    </div>
  );
}
