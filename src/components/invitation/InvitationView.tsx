"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Armchair,
  Ban,
  Cake,
  CalendarPlus,
  Camera,
  Car,
  Check,
  ChevronDown,
  Church,
  Copy,
  Gem,
  Gift,
  Heart,
  MapPin,
  Moon,
  Music,
  Pause,
  PartyPopper,
  Play,
  Sparkles,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from "lucide-react";
import { invitationTheme, monogram } from "@/lib/invitationThemes";
import { EVENT_TIME_ZONE, formatEventTime } from "@/lib/eventTime";
import { firstName } from "@/lib/invitationMessage";
import { calendarLinks } from "@/components/invitation/calendar";
import { RsvpSection } from "@/components/invitation/RsvpSection";
import { HeartDivider, Ornament, Sprig, TornEdge } from "@/components/invitation/decor";
import type { InvitationData, InvitationGuestData } from "@/lib/guestInvitations";
import { cn } from "@/lib/utils";

export { Ornament };

export type InvitationViewProps = {
  data: InvitationData;
  guest: InvitationGuestData | null;
  /** Token del enlace; sin él (vista previa del editor o ejemplos) el RSVP no se envía. */
  token?: string;
  /** Dentro del editor: sin altura de pantalla completa (las animaciones sí se ven). */
  embedded?: boolean;
  /**
   * Las animaciones esperan a que sea `true` (la invitación pública lo activa al abrir el
   * sobre, para que la portada se anime a la vista y no detrás del sobre).
   */
  started?: boolean;
};

/** Orden en una cascada de animación (ver .inv-rise, .inv-pop… en globals.css). */
const order = (i: number) => ({ "--i": i }) as CSSProperties;

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
    "--inv-band": t.band,
    "--inv-band-ink": t.bandInk,
  } as CSSProperties;
}

const ITINERARY_ICON: Record<string, LucideIcon> = {
  rings: Gem,
  church: Church,
  cheers: Wine,
  camera: Camera,
  dinner: UtensilsCrossed,
  dance: Sparkles,
  cake: Cake,
  party: PartyPopper,
  music: Music,
  car: Car,
  heart: Heart,
  moon: Moon,
};

/** Solo http(s) o rutas de la propia app (fotos de ejemplo); nunca javascript:, data:, etc. */
const isSafeUrl = (url: string) => /^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url);

/** Hace aparecer los bloques `.inv-reveal` al entrar en pantalla. */
function useReveal(rootRef: React.RefObject<HTMLElement | null>, enabled: boolean, started: boolean) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !started) return;
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
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [rootRef, enabled, started]);
}

/** Día del evento (año, mes 0-11, día) en la zona de la boda, con nombres en español. */
function eventDayParts(data: InvitationData) {
  const source = data.ceremonyTime ?? data.receptionTime ?? data.weddingDate;
  if (!source) return null;
  const tz = data.ceremonyTime || data.receptionTime ? EVENT_TIME_ZONE : "UTC";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(
    new Date(source)
  );
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const year = get("year");
  const month = get("month") - 1;
  const day = get("day");
  const utc = new Date(Date.UTC(year, month, day));
  return {
    year,
    month,
    day,
    weekday: new Intl.DateTimeFormat("es-HN", { weekday: "long", timeZone: "UTC" }).format(utc),
    monthName: new Intl.DateTimeFormat("es-HN", { month: "long", timeZone: "UTC" }).format(utc),
  };
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
    return <p className="inv-script text-5xl">¡Hoy es el gran día!</p>;
  }
  const units = [
    { label: "Días", value: Math.floor(diff / 86_400_000) },
    { label: "Horas", value: Math.floor(diff / 3_600_000) % 24 },
    { label: "Min", value: Math.floor(diff / 60_000) % 60 },
    { label: "Seg", value: Math.floor(diff / 1000) % 60 },
  ];
  return (
    <div className="flex items-start justify-center gap-1.5" aria-label="Cuenta regresiva">
      {units.map((u, i) => (
        <div key={u.label} className="flex items-start gap-1.5">
          <div className="flex min-w-14 flex-col items-center">
            <span className="overflow-hidden text-[2.6rem] leading-none font-medium tabular-nums">
              {now === null ? (
                "–"
              ) : (
                <span key={u.value} className="inv-tick">
                  {String(u.value).padStart(2, "0")}
                </span>
              )}
            </span>
            <span className="inv-caps mt-2 text-[0.55rem] opacity-75">{u.label}</span>
          </div>
          {i < units.length - 1 && <span className="text-3xl leading-none opacity-60">:</span>}
        </div>
      ))}
    </div>
  );
}

/** Mes de la boda con el día marcado con un corazón. */
function MonthCalendar({ year, month, day }: { year: number; month: number; day: number }) {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7; // lunes primero
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  return (
    <div className="mx-auto mt-6 w-full max-w-[17rem]">
      <div className="grid grid-cols-7 gap-y-1.5 text-center">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <span key={i} className="inv-caps text-[0.55rem] text-(--inv-muted)">
            {d}
          </span>
        ))}
        {cells.map((n, i) => (
          <span key={i} className="relative flex h-7 items-center justify-center text-sm tabular-nums">
            {n === day && (
              <span className="inv-pop absolute inset-0 flex items-center justify-center" style={order(4)} aria-hidden>
                <Heart className="inv-beat size-7 text-(--inv-accent)" fill="currentColor" strokeWidth={0} />
              </span>
            )}
            <span className={cn("relative", n === day && "font-semibold text-(--inv-paper)")}>{n ?? ""}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function SongPlayer({ url, title }: { url: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  return (
    <div className="inv-paper mx-auto max-w-sm rounded-2xl border border-(--inv-gold)/40 px-6 py-5 text-center shadow-[0_14px_30px_-24px_rgba(0,0,0,0.5)]">
      <p className="text-base italic text-(--inv-muted)">{title || "Dale play a nuestra canción"}</p>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-(--inv-gold)/25">
        <div className="h-full rounded-full bg-(--inv-accent) transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausar canción" : "Reproducir canción"}
        className="mx-auto mt-4 flex size-12 items-center justify-center rounded-full bg-(--inv-accent) text-(--inv-paper) shadow-md transition-transform active:scale-95"
      >
        {playing ? <Pause className="size-5" fill="currentColor" /> : <Play className="ml-0.5 size-5" fill="currentColor" />}
      </button>
      <audio
        ref={audioRef}
        src={url}
        preload="none"
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
        }}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}

function CopyAccount({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value.replace(/\s/g, ""));
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Sin portapapeles: el número queda visible para copiarlo a mano.
        }
      }}
      className="inv-caps inline-flex items-center gap-1.5 rounded-full border border-(--inv-accent)/50 px-3 py-1.5 text-[0.6rem] text-(--inv-accent)"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

function Section({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("inv-reveal px-7 py-12 text-center", className)}>{children}</section>;
}

function Title({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="mb-7">
      {eyebrow && <p className="inv-caps text-[0.68rem] text-(--inv-muted)">{eyebrow}</p>}
      <h2 className="inv-script mt-1 text-[2.75rem] leading-tight text-(--inv-accent)">
        <span className="inv-draw">{title}</span>
      </h2>
      <HeartDivider className="mt-2" />
    </div>
  );
}

/** Franja oscura con bordes de papel rasgado. */
function Band({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="inv-reveal">
      <TornEdge side="top" />
      <div className={cn("bg-(--inv-band) px-7 py-12 text-center text-(--inv-band-ink)", className)}>{children}</div>
      <TornEdge side="bottom" />
    </div>
  );
}

function mapsUrl(mapUrl: string, place: string, address: string) {
  if (/^https?:\/\//i.test(mapUrl)) return mapUrl;
  const q = [place, address].filter(Boolean).join(", ");
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : "";
}

function EventBlock({
  icon: Icon,
  title,
  time,
  place,
  address,
  mapUrl,
}: {
  icon: LucideIcon;
  title: string;
  time: string | null;
  place: string;
  address: string;
  mapUrl: string;
}) {
  const href = mapsUrl(mapUrl, place, address);
  return (
    <div className="flex flex-col items-center">
      <span className="inv-pop flex size-14 items-center justify-center rounded-full bg-(--inv-band) text-(--inv-band-ink)">
        <Icon className="size-6" strokeWidth={1.4} />
      </span>
      <h3 className="inv-script mt-3 text-4xl text-(--inv-accent)">
        <span className="inv-draw" style={order(2)}>
          {title}
        </span>
      </h3>
      {time && <p className="mt-1 text-xl font-semibold">{formatEventTime(time)}</p>}
      {place && <p className="inv-caps mt-1 text-[0.72rem] font-semibold">{place}</p>}
      {address && <p className="mt-0.5 text-base italic text-(--inv-muted)">{address}</p>}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inv-caps mt-4 inline-flex items-center gap-2 rounded-full bg-(--inv-band) px-5 py-2.5 text-[0.62rem] text-(--inv-band-ink) shadow-sm transition-opacity hover:opacity-90"
        >
          <MapPin className="size-3.5" />
          Ver ubicación
        </a>
      )}
    </div>
  );
}

/** "Rol: Nombres" por línea → pares. */
function parseSponsors(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [role, ...rest] = line.split(":");
      return rest.length ? { role: role.trim(), names: rest.join(":").trim() } : { role: "", names: line };
    });
}

const lines = (raw: string) =>
  raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export function InvitationView({ data, guest, token, embedded = false, started = true }: InvitationViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef, true, started);

  const p1 = data.partner1 || "";
  const p2 = data.partner2 || "";
  const mono = monogram(p1, p2);
  const day = eventDayParts(data);
  const eventStart = data.ceremonyTime ?? data.receptionTime ?? data.weddingDate;
  const hasCeremony = Boolean(data.ceremonyPlace || data.ceremonyTime);
  const hasReception = Boolean(data.receptionPlace || data.receptionTime);
  const fallbackVenue = !hasCeremony && !hasReception && (data.venueName || data.venueAddress);
  const calendar = calendarLinks(data, token);
  const cover = isSafeUrl(data.coverImageUrl) ? data.coverImageUrl : "";
  const gallery = data.galleryUrls.filter(isSafeUrl);
  const closingPhoto = gallery.at(-1) ?? cover;
  const sponsors = parseSponsors(data.sponsors);
  const brideParents = lines(data.brideParents);
  const groomParents = lines(data.groomParents);
  const colors = data.dressCodeColors.filter((c) => /^#[0-9a-f]{6}$/i.test(c));
  const hasGiftAccount = Boolean(data.giftAccount);
  const registry = /^https?:\/\//i.test(data.giftRegistryUrl) ? data.giftRegistryUrl : "";
  const song = isSafeUrl(data.songUrl) ? data.songUrl : "";

  return (
    <div ref={rootRef} style={themeStyle(data.theme)} className="inv-root @container bg-(--inv-bg) text-(--inv-ink)">
      <div className="inv-paper relative mx-auto max-w-[34rem] overflow-hidden shadow-[0_0_60px_-20px_rgba(0,0,0,0.25)]">
        {/* Portada */}
        <header className={cn("inv-reveal inv-reveal-static relative px-7 pt-14 pb-10 text-center", !embedded && "min-h-svh")}>
          <Sprig className="absolute -top-2 -left-6 w-36 rotate-[200deg] opacity-80" />
          <Sprig className="absolute -top-2 -right-6 w-36 rotate-[200deg] opacity-80" flip />

          <p className="inv-caps inv-rise relative text-[0.66rem] text-(--inv-muted)" style={order(0)}>
            Junto a sus familias
          </p>
          <h1 className="relative mt-4 leading-none">
            <span className="inv-letters block text-[clamp(2.4rem,13cqw,3.6rem)] font-medium uppercase" style={order(0)}>
              {p1 || "Nuestra"}
            </span>
            <span className="inv-script my-1 block text-[2.4rem] text-(--inv-accent)">
              <span className="inv-draw" style={order(5)}>
                {p1 && p2 ? "y" : ""}
              </span>
            </span>
            <span className="inv-letters block text-[clamp(2.4rem,13cqw,3.6rem)] font-medium uppercase" style={order(1)}>
              {p2 || "boda"}
            </span>
          </h1>
          <p className="inv-caps inv-rise mt-4 text-[0.66rem] text-(--inv-muted)" style={order(5)}>
            te invitan a su
          </p>
          <p className="inv-script text-[3.2rem] leading-tight text-(--inv-accent)">
            <span className="inv-draw" style={order(6)}>
              Boda
            </span>
          </p>

          {cover ? (
            <div className="relative mx-auto mt-6 w-[78%]">
              <Sprig className="absolute -bottom-6 -left-10 z-10 w-28" />
              <Sprig className="absolute -right-10 -bottom-6 z-10 w-28" flip />
              <div className="inv-unveil overflow-hidden rounded-t-full border-[6px] border-(--inv-paper) shadow-[0_20px_40px_-20px_rgba(0,0,0,0.45)] ring-1 ring-(--inv-gold)/50">
                {/* eslint-disable-next-line @next/next/no-img-element -- foto elegida por la pareja */}
                <img src={cover} alt={[p1, p2].filter(Boolean).join(" y ")} className="aspect-[3/4] w-full object-cover" />
              </div>
            </div>
          ) : (
            <div
              className="inv-pop mx-auto mt-8 flex size-24 items-center justify-center rounded-full border border-(--inv-gold) text-lg tracking-[0.2em] text-(--inv-accent)"
              style={order(6)}
            >
              {mono}
            </div>
          )}

          <p className="inv-script mt-8 text-[2.4rem] leading-tight text-(--inv-accent)">
            <span className="inv-draw" style={order(14)}>
              {data.headline || "¡Nos casamos!"}
            </span>
          </p>
          <HeartDivider className="mt-2" />
          {!embedded && <ChevronDown className="inv-float mx-auto mt-6 size-5 text-(--inv-gold)" aria-hidden />}
        </header>

        {/* Saludo personal, mensaje y familia */}
        <Section className="pt-4">
          {guest && (
            <p className="inv-script text-[2.8rem] text-(--inv-accent)">
              <span className="inv-draw">{firstName(guest.fullName)},</span>
            </p>
          )}
          <p className="mx-auto mt-3 max-w-sm text-[1.15rem] leading-relaxed">
            {data.message ||
              "Con la bendición de Dios y de nuestras familias, tenemos el honor de invitarte a celebrar el día en que uniremos nuestras vidas."}
          </p>
          {data.quote && <blockquote className="mx-auto mt-6 max-w-xs text-base italic text-(--inv-muted)">“{data.quote}”</blockquote>}

          {guest && (
            <div className="inv-rise mx-auto mt-8 flex w-fit items-center gap-4 rounded-2xl border border-(--inv-gold)/50 px-6 py-4" style={order(3)}>
              <Armchair className="size-8 text-(--inv-accent)" strokeWidth={1.2} />
              <div className="text-left">
                <p className="inv-caps text-[0.6rem] text-(--inv-muted)">Lugares reservados</p>
                <p className="text-sm italic text-(--inv-muted)">para ti{guest.seats > 1 ? " y tu compañía" : ""}</p>
              </div>
              <span className="flex size-11 items-center justify-center rounded-md border border-(--inv-accent) text-2xl font-semibold text-(--inv-accent)">
                {guest.seats}
              </span>
            </div>
          )}

          {(brideParents.length > 0 || groomParents.length > 0) && (
            <div className="mt-10 grid grid-cols-2 gap-5">
              {[
                { title: "Padres de la novia", names: brideParents },
                { title: "Padres del novio", names: groomParents },
              ]
                .filter((g) => g.names.length > 0)
                .map((g) => (
                  <div key={g.title} className={cn((brideParents.length === 0 || groomParents.length === 0) && "col-span-2")}>
                    <p className="inv-caps text-[0.6rem] font-semibold text-(--inv-accent)">{g.title}</p>
                    {g.names.map((n) => (
                      <p key={n} className="mt-1 text-[0.95rem]">
                        {n}
                      </p>
                    ))}
                  </div>
                ))}
            </div>
          )}

          {sponsors.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-4">
              {sponsors.map((s, i) => (
                <div key={i} className={cn(sponsors.length % 2 === 1 && i === sponsors.length - 1 && "col-span-2")}>
                  {s.role && <p className="inv-caps text-[0.58rem] font-semibold text-(--inv-accent)">{s.role}</p>}
                  <p className="mt-1 text-[0.95rem]">{s.names}</p>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Reserva la fecha */}
        {day && (
          <Section className="pt-2">
            <p className="inv-caps text-[0.68rem] text-(--inv-muted)">Reserva la fecha</p>
            <p className="inv-caps mt-5 text-sm font-semibold text-(--inv-accent)">{day.monthName}</p>
            <div className="mt-2 flex items-center justify-center gap-4">
              <span className="inv-caps w-24 border-y border-(--inv-gold)/70 py-1.5 text-[0.65rem]">{day.weekday}</span>
              <span className="inv-pop text-6xl leading-none font-medium text-(--inv-accent)" style={order(1)}>
                {day.day}
              </span>
              <span className="inv-caps w-24 border-y border-(--inv-gold)/70 py-1.5 text-[0.65rem]">{day.year}</span>
            </div>
            <MonthCalendar year={day.year} month={day.month} day={day.day} />
            {calendar && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <a
                  href={calendar.google}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inv-caps inline-flex items-center gap-1.5 rounded-full border border-(--inv-accent)/50 px-4 py-2 text-[0.58rem] text-(--inv-accent)"
                >
                  <CalendarPlus className="size-3.5" />
                  Google Calendar
                </a>
                {calendar.ics && (
                  <a
                    href={calendar.ics}
                    className="inv-caps inline-flex items-center gap-1.5 rounded-full border border-(--inv-accent)/50 px-4 py-2 text-[0.58rem] text-(--inv-accent)"
                  >
                    <CalendarPlus className="size-3.5" />
                    Apple / Outlook
                  </a>
                )}
              </div>
            )}
          </Section>
        )}

        {data.showCountdown && eventStart && (
          <Band>
            <p className="inv-caps text-xs opacity-80">Faltan</p>
            <div className="mt-4">
              <Countdown target={eventStart} />
            </div>
            <p className="inv-script mt-5 text-3xl opacity-90">para nuestro gran día</p>
          </Band>
        )}

        {song && (
          <Section className="py-10">
            <SongPlayer url={song} title={data.songTitle} />
          </Section>
        )}

        {(hasCeremony || hasReception || fallbackVenue) && (
          <Section>
            <Title eyebrow="Cuándo y dónde" title="El gran día" />
            <div className="space-y-10">
              {hasCeremony && (
                <EventBlock
                  icon={Church}
                  title="Ceremonia"
                  time={data.ceremonyTime}
                  place={data.ceremonyPlace}
                  address={data.ceremonyAddress}
                  mapUrl={data.ceremonyMapUrl}
                />
              )}
              {hasCeremony && hasReception && <HeartDivider />}
              {hasReception && (
                <EventBlock
                  icon={Wine}
                  title="Recepción"
                  time={data.receptionTime}
                  place={data.receptionPlace}
                  address={data.receptionAddress}
                  mapUrl={data.receptionMapUrl}
                />
              )}
              {fallbackVenue && <EventBlock icon={MapPin} title="Lugar" time={null} place={data.venueName} address={data.venueAddress} mapUrl="" />}
            </div>
          </Section>
        )}

        {data.itinerary.length > 0 && (
          <Section>
            <Title eyebrow="Programa" title="del gran día" />
            <ol className="relative mx-auto max-w-[19rem] text-left">
              <span className="inv-grow-y absolute top-6 bottom-6 left-7 w-px bg-(--inv-gold)/60" aria-hidden />
              {data.itinerary.map((item, i) => {
                const Icon = ITINERARY_ICON[item.icon] ?? Heart;
                return (
                  <li key={i} className="inv-rise relative flex items-center gap-5 py-2.5" style={order(i * 2 + 1)}>
                    <span
                      style={order(i * 2 + 1)}
                      className="inv-pop relative z-10 flex size-14 shrink-0 items-center justify-center rounded-full bg-(--inv-band) text-(--inv-band-ink) shadow-[0_6px_14px_-8px_rgba(0,0,0,0.5)]"
                    >
                      <Icon className="size-6" strokeWidth={1.4} />
                    </span>
                    <div>
                      {item.time && <p className="text-xl leading-tight font-semibold">{item.time}</p>}
                      <p className="text-[1.05rem] leading-snug text-(--inv-muted)">{item.title}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Section>
        )}

        {(data.dressCode || colors.length > 0) && (
          <Band>
            <p className="inv-caps text-xs text-(--inv-gold)">Código de vestimenta</p>
            {data.dressCode && (
              <p className="inv-script mt-2 text-5xl">
                <span className="inv-draw">{data.dressCode}</span>
              </p>
            )}
            {colors.length > 0 && (
              <div className="mt-6 flex justify-center gap-3">
                {colors.map((c, i) => (
                  <span
                    key={c}
                    className="inv-pop size-10 rounded-full ring-2 ring-(--inv-band-ink)/30"
                    style={{ background: c, ...order(i + 4) }}
                  />
                ))}
              </div>
            )}
            {data.dressCodeNote && <p className="mx-auto mt-5 max-w-xs text-base italic opacity-85">{data.dressCodeNote}</p>}
          </Band>
        )}

        {(data.giftsNote || hasGiftAccount || registry) && (
          <Section>
            <Gift className="inv-pop mx-auto size-9 text-(--inv-accent)" strokeWidth={1.2} />
            <h2 className="inv-script mt-2 text-[2.75rem] leading-tight text-(--inv-accent)">
              <span className="inv-draw" style={order(1)}>
                Sugerencia de regalo
              </span>
            </h2>
            <HeartDivider className="mt-2 mb-5" />
            {data.giftsNote && <p className="mx-auto max-w-sm text-[1.05rem] leading-relaxed whitespace-pre-line">{data.giftsNote}</p>}
            {hasGiftAccount && (
              <div className="mx-auto mt-6 max-w-xs rounded-2xl border border-(--inv-gold)/50 px-5 py-5">
                <p className="inv-caps text-[0.6rem] text-(--inv-muted)">Transferencia</p>
                {data.giftBankName && <p className="mt-2 font-semibold">{data.giftBankName}</p>}
                <p className="mt-1 text-xl font-medium tracking-wider tabular-nums">{data.giftAccount}</p>
                {data.giftAccountHolder && <p className="text-sm italic text-(--inv-muted)">Titular: {data.giftAccountHolder}</p>}
                <div className="mt-3">
                  <CopyAccount value={data.giftAccount} />
                </div>
              </div>
            )}
            {registry && (
              <a
                href={registry}
                target="_blank"
                rel="noopener noreferrer"
                className="inv-caps mt-5 inline-flex items-center gap-2 rounded-full bg-(--inv-band) px-5 py-2.5 text-[0.62rem] text-(--inv-band-ink)"
              >
                <Gift className="size-3.5" />
                Ver mesa de regalos
              </a>
            )}
          </Section>
        )}

        {gallery.length > 0 && (
          <Section className="px-5">
            <Title eyebrow="Nuestra historia" title="Galería" />
            <div className="grid auto-rows-[8.5rem] grid-cols-2 gap-2">
              {gallery.slice(0, 6).map((url, i) => (
                <div
                  key={url + i}
                  style={order(i + 2)}
                  className={cn(
                    "inv-rise overflow-hidden rounded-md",
                    i === 0 && gallery.length >= 3 && "row-span-2",
                    gallery.length === 1 && "col-span-2 row-span-2"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- fotos elegidas por la pareja */}
                  <img src={url} alt="" loading="lazy" className="inv-zoom size-full object-cover" style={order(i + 2)} />
                </div>
              ))}
            </div>
          </Section>
        )}

        {guest && (
          <Section>
            <Title eyebrow="Confirma tu asistencia" title="¿Nos acompañas?" />
            <RsvpSection guest={guest} token={token} rsvpDeadline={data.rsvpDeadline} />
          </Section>
        )}

        {(data.adultsOnly || data.recommendations) && (
          <Section className="pt-2">
            {data.adultsOnly && (
              <div>
                <Ban className="mx-auto size-7 text-(--inv-accent)" strokeWidth={1.3} />
                <p className="inv-caps mt-2 text-xs font-semibold">Solo adultos</p>
                <p className="mx-auto mt-1 max-w-xs text-base text-(--inv-muted)">
                  Amamos a los niños, pero esta será una celebración solo para adultos. ¡Tómense la noche libre y disfruten con nosotros!
                </p>
              </div>
            )}
            {data.adultsOnly && data.recommendations && <HeartDivider className="my-6" />}
            {data.recommendations && (
              <div>
                <p className="inv-caps text-xs font-semibold">Recomendaciones</p>
                <p className="mx-auto mt-1 max-w-xs text-base whitespace-pre-line text-(--inv-muted)">{data.recommendations}</p>
              </div>
            )}
          </Section>
        )}

        {/* Cierre */}
        <div className="inv-reveal">
          <TornEdge side="top" />
          <div className="relative overflow-hidden bg-(--inv-band) px-7 py-16 text-center text-(--inv-band-ink)">
            {closingPhoto && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- foto elegida por la pareja */}
                <img src={closingPhoto} alt="" className="inv-kenburns absolute inset-0 size-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/30" />
              </>
            )}
            <div className={cn("relative", closingPhoto && "text-white")}>
              <p className="inv-caps text-[0.66rem] opacity-80">Esperamos contar con tu presencia</p>
              <p className="inv-script mt-2 text-6xl">
                <span className="inv-draw" style={order(2)}>
                  ¡Gracias!
                </span>
              </p>
              {data.closingMessage && <p className="mx-auto mt-3 max-w-xs text-base opacity-90">{data.closingMessage}</p>}
              <p className="mt-6 text-sm tracking-[0.3em] uppercase opacity-90">{[p1, p2].filter(Boolean).join(" & ")}</p>
              {data.hashtag && <p className="inv-caps mt-2 text-[0.62rem] opacity-80">{data.hashtag}</p>}
            </div>
          </div>
          <p className="bg-(--inv-band) pb-5 text-center text-[0.6rem] text-(--inv-band-ink) opacity-60">Invitación hecha con Wedplan</p>
        </div>
      </div>
    </div>
  );
}
