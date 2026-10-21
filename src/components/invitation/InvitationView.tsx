"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CalendarPlus, ChevronDown, Gift, MapPin, Shirt } from "lucide-react";
import { invitationTheme, monogram } from "@/lib/invitationThemes";
import { formatEventDay, formatEventTime } from "@/lib/eventTime";
import { firstName } from "@/lib/invitationMessage";
import { calendarLinks } from "@/components/invitation/calendar";
import { RsvpSection } from "@/components/invitation/RsvpSection";
import type { InvitationData, InvitationGuestData } from "@/lib/guestInvitations";
import { cn } from "@/lib/utils";

export type InvitationViewProps = {
  data: InvitationData;
  guest: InvitationGuestData | null;
  /** Token del enlace; sin él (vista previa del editor) el RSVP no se envía. */
  token?: string;
  /** Dentro del editor: sin altura de pantalla completa ni animaciones de entrada. */
  embedded?: boolean;
};

export function themeStyle(themeName: string): CSSProperties {
  const t = invitationTheme(themeName);
  return {
    "--inv-bg": t.background,
    "--inv-paper": t.paper,
    "--inv-ink": t.ink,
    "--inv-muted": t.muted,
    "--inv-accent": t.accent,
    "--inv-gold": t.gold,
    "--inv-envelope": t.envelope,
    "--inv-flap": t.envelopeFlap,
    "--inv-seal": t.seal,
    "--inv-seal-ink": t.sealInk,
  } as CSSProperties;
}

/** Hace aparecer los bloques `.inv-reveal` al entrar en pantalla. */
function useReveal(rootRef: React.RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(".inv-reveal"));
    if (!enabled || typeof IntersectionObserver === "undefined") {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [rootRef, enabled]);
}

export function Ornament({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 20" className={cn("h-4 w-48 text-(--inv-gold)", className)} aria-hidden>
      <path d="M0 10 H96" stroke="currentColor" strokeWidth="0.8" />
      <path d="M144 10 H240" stroke="currentColor" strokeWidth="0.8" />
      <path d="M120 2 L128 10 L120 18 L112 10 Z" fill="none" stroke="currentColor" strokeWidth="0.9" />
      <circle cx="120" cy="10" r="2" fill="currentColor" />
      <circle cx="104" cy="10" r="1.3" fill="currentColor" />
      <circle cx="136" cy="10" r="1.3" fill="currentColor" />
    </svg>
  );
}

function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const diff = Math.max(0, new Date(target).getTime() - (now ?? 0));
  if (now !== null && diff === 0) {
    return <p className="inv-script text-4xl text-(--inv-accent)">¡Hoy es el gran día!</p>;
  }
  const units = [
    { label: "Días", value: Math.floor(diff / 86_400_000) },
    { label: "Horas", value: Math.floor(diff / 3_600_000) % 24 },
    { label: "Min", value: Math.floor(diff / 60_000) % 60 },
    { label: "Seg", value: Math.floor(diff / 1000) % 60 },
  ];

  return (
    <div className="flex justify-center gap-2.5 @xl:gap-4" aria-label="Cuenta regresiva">
      {units.map((u) => (
        <div
          key={u.label}
          className="flex w-[4.4rem] flex-col items-center rounded-xl border border-(--inv-gold)/40 bg-(--inv-paper) py-3 shadow-[0_1px_0_rgba(0,0,0,0.03)] @xl:w-20"
        >
          <span className="text-3xl font-medium tabular-nums text-(--inv-ink) @xl:text-4xl">
            {now === null ? "–" : String(u.value).padStart(2, "0")}
          </span>
          <span className="inv-caps mt-1 text-[0.6rem] text-(--inv-muted)">{u.label}</span>
        </div>
      ))}
    </div>
  );
}

function Section({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("inv-reveal mx-auto w-full max-w-xl px-6", className)}>{children}</section>;
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6 text-center">
      <p className="inv-caps text-[0.7rem] text-(--inv-muted)">{eyebrow}</p>
      <h2 className="inv-script mt-1 text-5xl text-(--inv-accent)">{title}</h2>
    </div>
  );
}

/** Solo http(s) o rutas de la propia app (fotos de ejemplo); nunca javascript:, data:, etc. */
const isHttpUrl = (url: string) => /^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url);

function mapsUrl(mapUrl: string, place: string, address: string) {
  if (isHttpUrl(mapUrl)) return mapUrl;
  const q = [place, address].filter(Boolean).join(", ");
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : "";
}

function EventCard({
  title,
  time,
  place,
  address,
  mapUrl,
}: {
  title: string;
  time: string | null;
  place: string;
  address: string;
  mapUrl: string;
}) {
  const href = mapsUrl(mapUrl, place, address);
  return (
    <div className="inv-paper relative flex flex-1 flex-col items-center rounded-2xl border border-(--inv-gold)/35 px-6 py-8 text-center shadow-[0_18px_40px_-28px_rgba(0,0,0,0.35)]">
      <div className="pointer-events-none absolute inset-2 rounded-xl border border-(--inv-gold)/20" />
      <p className="inv-caps text-[0.7rem] text-(--inv-muted)">{title}</p>
      {time && <p className="mt-3 text-4xl font-medium text-(--inv-ink)">{formatEventTime(time)}</p>}
      {place && <p className="mt-2 text-xl font-semibold text-(--inv-ink)">{place}</p>}
      {address && <p className="mt-1 text-base text-(--inv-muted)">{address}</p>}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inv-caps mt-5 inline-flex items-center gap-2 rounded-full border border-(--inv-accent) px-5 py-2.5 text-[0.68rem] text-(--inv-accent) transition-colors hover:bg-(--inv-accent) hover:text-(--inv-paper)"
        >
          <MapPin className="size-3.5" />
          Cómo llegar
        </a>
      )}
    </div>
  );
}

export function InvitationView({ data, guest, token, embedded = false }: InvitationViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef, !embedded);

  const names = [data.partner1, data.partner2].filter(Boolean);
  const mono = monogram(data.partner1, data.partner2);
  const eventStart = data.ceremonyTime ?? data.receptionTime ?? data.weddingDate;
  const dayLabel = data.ceremonyTime
    ? formatEventDay(data.ceremonyTime)
    : data.weddingDate
      ? formatEventDay(data.weddingDate, { utc: true })
      : "";
  const hasCeremony = Boolean(data.ceremonyPlace || data.ceremonyTime);
  const hasReception = Boolean(data.receptionPlace || data.receptionTime);
  const fallbackVenue = !hasCeremony && !hasReception && (data.venueName || data.venueAddress);
  const calendar = calendarLinks(data, token);
  const hasCover = isHttpUrl(data.coverImageUrl);

  return (
    <div
      ref={rootRef}
      style={themeStyle(data.theme)}
      className="inv-root @container bg-(--inv-bg) text-(--inv-ink) selection:bg-(--inv-gold)/30"
    >
      {/* Portada */}
      <header
        className={cn(
          "relative flex flex-col items-center justify-center overflow-hidden px-6 text-center",
          embedded ? "min-h-[36rem] py-16" : "min-h-svh py-20"
        )}
      >
        {hasCover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- URL externa elegida por la pareja */}
            <img src={data.coverImageUrl} alt="" className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/25 to-black/65" />
          </>
        ) : (
          <div className="inv-paper absolute inset-0">
            <div className="absolute inset-4 rounded-[2rem] border border-(--inv-gold)/40 @xl:inset-6" />
            <div className="absolute inset-6 rounded-[1.6rem] border border-(--inv-gold)/20 @xl:inset-8" />
          </div>
        )}

        <div className={cn("relative flex flex-col items-center", hasCover && "text-white")}>
          <div
            className={cn(
              "flex size-20 items-center justify-center rounded-full border text-lg tracking-[0.2em]",
              hasCover ? "border-white/60" : "border-(--inv-gold) text-(--inv-accent)"
            )}
          >
            {mono}
          </div>
          <p className={cn("inv-caps mt-8 text-xs", hasCover ? "text-white/85" : "text-(--inv-muted)")}>
            {data.headline || "¡Nos casamos!"}
          </p>
          <h1
            className={cn(
              "inv-script mt-4 text-[clamp(3.4rem,15cqw,7.5rem)]",
              hasCover ? "text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)]" : "text-(--inv-ink)"
            )}
          >
            {names.length === 2 ? (
              <>
                {names[0]}
                <span className={cn("mx-3 inline-block text-[0.6em]", !hasCover && "text-(--inv-gold)")}>&amp;</span>
                {names[1]}
              </>
            ) : (
              names[0] ?? "Nuestra boda"
            )}
          </h1>
          <Ornament className={cn("mt-6", hasCover && "text-white/80")} />
          {dayLabel && <p className="inv-caps mt-6 text-sm @xl:text-base">{dayLabel}</p>}
          {(data.ceremonyPlace || data.venueName) && (
            <p className={cn("mt-2 text-lg italic", hasCover ? "text-white/85" : "text-(--inv-muted)")}>
              {data.ceremonyPlace || data.venueName}
            </p>
          )}
        </div>

        {!embedded && (
          <ChevronDown
            className={cn(
              "inv-float absolute bottom-8 size-6",
              hasCover ? "text-white/80" : "text-(--inv-gold)"
            )}
            aria-hidden
          />
        )}
      </header>

      <div className="space-y-24 py-24">
        {/* Saludo personal */}
        <Section className="text-center">
          {guest ? (
            <>
              <p className="inv-script text-5xl text-(--inv-accent)">{firstName(guest.fullName)},</p>
              <p className="mt-5 text-xl leading-relaxed text-(--inv-ink)">
                {data.message ||
                  "Con la bendición de Dios y de nuestras familias, tenemos el honor de invitarte a celebrar con nosotros el día en que uniremos nuestras vidas."}
              </p>
              <div className="mx-auto mt-8 inline-flex flex-col items-center rounded-2xl border border-(--inv-gold)/40 px-8 py-5">
                <span className="inv-caps text-[0.65rem] text-(--inv-muted)">Lugares reservados en tu honor</span>
                <span className="mt-1 text-5xl font-medium text-(--inv-accent)">{guest.seats}</span>
                {guest.plusOneNames.length > 0 && (
                  <span className="mt-1 text-base italic text-(--inv-muted)">
                    {[guest.fullName, ...guest.plusOneNames].join(" · ")}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="text-xl leading-relaxed">
              {data.message || "Tenemos el honor de invitarte a celebrar con nosotros el día en que uniremos nuestras vidas."}
            </p>
          )}
          {data.quote && (
            <blockquote className="mx-auto mt-10 max-w-md text-lg italic text-(--inv-muted)">“{data.quote}”</blockquote>
          )}
        </Section>

        {data.showCountdown && eventStart && (
          <Section>
            <SectionTitle eyebrow="Faltan" title="La cuenta regresiva" />
            <Countdown target={eventStart} />
          </Section>
        )}

        {(hasCeremony || hasReception || fallbackVenue) && (
          <Section className="max-w-3xl">
            <SectionTitle eyebrow="Cuándo y dónde" title="El gran día" />
            <div className="flex flex-col gap-5 @xl:flex-row">
              {hasCeremony && (
                <EventCard
                  title="Ceremonia"
                  time={data.ceremonyTime}
                  place={data.ceremonyPlace}
                  address={data.ceremonyAddress}
                  mapUrl={data.ceremonyMapUrl}
                />
              )}
              {hasReception && (
                <EventCard
                  title="Recepción"
                  time={data.receptionTime}
                  place={data.receptionPlace}
                  address={data.receptionAddress}
                  mapUrl={data.receptionMapUrl}
                />
              )}
              {fallbackVenue && (
                <EventCard title="Lugar" time={null} place={data.venueName} address={data.venueAddress} mapUrl="" />
              )}
            </div>
            {calendar && (
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <a
                  href={calendar.google}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inv-caps inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.65rem] text-(--inv-muted) transition-colors hover:text-(--inv-accent)"
                >
                  <CalendarPlus className="size-3.5" />
                  Google Calendar
                </a>
                {calendar.ics && (
                  <a
                    href={calendar.ics}
                    className="inv-caps inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.65rem] text-(--inv-muted) transition-colors hover:text-(--inv-accent)"
                  >
                    <CalendarPlus className="size-3.5" />
                    Apple / Outlook
                  </a>
                )}
              </div>
            )}
          </Section>
        )}

        {(data.dressCode || data.giftsNote) && (
          <Section className="max-w-3xl">
            <div className="grid gap-5 @xl:grid-cols-2">
              {data.dressCode && (
                <div className="text-center">
                  <Shirt className="mx-auto size-6 text-(--inv-gold)" strokeWidth={1.4} />
                  <p className="inv-caps mt-3 text-[0.7rem] text-(--inv-muted)">Código de vestimenta</p>
                  <p className="mt-2 text-2xl font-semibold">{data.dressCode}</p>
                  {data.dressCodeNote && <p className="mt-1 text-base text-(--inv-muted)">{data.dressCodeNote}</p>}
                </div>
              )}
              {data.giftsNote && (
                <div className={cn("text-center", !data.dressCode && "@xl:col-span-2")}>
                  <Gift className="mx-auto size-6 text-(--inv-gold)" strokeWidth={1.4} />
                  <p className="inv-caps mt-3 text-[0.7rem] text-(--inv-muted)">Mesa de regalos</p>
                  <p className="mt-2 whitespace-pre-line text-lg leading-relaxed">{data.giftsNote}</p>
                </div>
              )}
            </div>
          </Section>
        )}

        {guest && (
          <Section>
            <SectionTitle eyebrow="Confirma tu asistencia" title="¿Nos acompañas?" />
            <RsvpSection guest={guest} token={token} rsvpDeadline={data.rsvpDeadline} />
          </Section>
        )}

        <Section className="text-center">
          <Ornament className="mx-auto" />
          {data.hashtag && <p className="inv-caps mt-8 text-sm text-(--inv-accent)">{data.hashtag}</p>}
          <p className="inv-script mt-6 text-5xl text-(--inv-ink)">{names.join(" & ") || "Con cariño"}</p>
          <p className="mt-12 text-xs text-(--inv-muted)">Invitación hecha con Wedplan</p>
        </Section>
      </div>
    </div>
  );
}
