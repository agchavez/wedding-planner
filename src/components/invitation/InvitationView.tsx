"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowUpRight, CalendarPlus, Gift, MapPin } from "lucide-react";
import "@/components/invitation/editorial.css";
import { calendarLinks } from "@/components/invitation/calendar";
import { RsvpSection } from "@/components/invitation/RsvpSection";
import {
  C,
  CopyButton,
  AVOID_GREENS,
  DressIcons,
  EditorialFonts,
  Lightbox,
  SANS,
  SCRIPT,
  SERIF,
  SongButton,
  eventDay,
  prettyTime,
  useCountdown,
  useReveal,
} from "@/components/invitation/kit";
import {
  BLOCK_INFO,
  designFromData,
  eventTimeToIso,
  framingStyle,
  projectDesign,
  responsiveImage,
  type BlockOf,
  type BlockType,
  type EventProps,
  type InvitationBlock,
  type InvitationDesign,
  type PhotoFraming,
} from "@/lib/invitationBlocks";
import type { InvitationData, InvitationGuestData } from "@/lib/guestInvitations";
import { cn } from "@/lib/utils";

export type InvitationViewProps = {
  data: InvitationData;
  /** Bloques a mostrar; sin ellos se derivan de `data` (ejemplos, invitaciones anteriores). */
  design?: InvitationDesign;
  guest: InvitationGuestData | null;
  /** Token del enlace; sin él (vista previa del editor o ejemplos) el RSVP no se envía. */
  token?: string;
  /** Dentro del editor: altura de pantalla fija y todo visible sin animaciones de scroll. */
  embedded?: boolean;
  /** Las animaciones de la portada esperan a que sea `true` (al abrir la invitación). */
  started?: boolean;
  /** Editor: bloque seleccionado y selección al tocar un bloque. */
  selectedId?: string | null;
  onSelectBlock?: (id: string) => void;
};

/** Paleta como variables CSS: la usan el formulario de confirmación y el editor. */
export const editorialStyle = {
  "--inv-bg": C.bg,
  "--inv-paper": "#f7f4ea",
  "--inv-ink": C.ink,
  "--inv-muted": C.muted,
  "--inv-accent": C.ink,
  "--inv-gold": C.accent,
  "--inv-band": C.deep,
  "--inv-band-ink": C.cream,
} as CSSProperties;

const d = (n: number) => ({ "--d": n }) as CSSProperties;
const lines = (raw: string) =>
  raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

function mapsLink(mapUrl: string, place: string, address: string) {
  if (/^https?:\/\//i.test(mapUrl)) return mapUrl;
  const q = [place, address].filter(Boolean).join(", ");
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : "";
}

const mapEmbed = (place: string, address: string) =>
  `https://www.google.com/maps?q=${encodeURIComponent([place, address].filter(Boolean).join(", "))}&output=embed`;

type Ctx = {
  data: InvitationData;
  design: InvitationDesign;
  guest: InvitationGuestData | null;
  token?: string;
  embedded: boolean;
  started: boolean;
  p1: string;
  p2: string;
  initials: string;
  couple: string;
  start: string | null;
  day: ReturnType<typeof eventDay>;
  city: string;
  calendar: ReturnType<typeof calendarLinks>;
  numbers: Record<string, string>;
  openLightbox: (images: string[], i: number) => void;
};

type BlockProps<T extends BlockType> = { block: BlockOf<T>; ctx: Ctx };

function Photo({
  src,
  alt = "",
  className,
  style,
  framing,
  sizes = "100vw",
  priority,
}: {
  src: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  /** Encuadre elegido en el editor (posición y zoom). */
  framing?: PhotoFraming;
  /** Ancho con que se muestra (atributo sizes); por defecto, el ancho de la pantalla. */
  sizes?: string;
  /** La portada se pide primero; el resto se carga al acercarse. */
  priority?: boolean;
}) {
  const { src: light, srcSet } = responsiveImage(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fotos elegidas por la pareja (Drive u otra URL)
    <img
      src={light}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      className={className}
      style={{ ...style, ...framingStyle(framing) }}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
    />
  );
}

/** Hueco para una foto que falta (solo en el editor). */
function PhotoSlot({ ctx, label, className }: { ctx: Ctx; label: string; className?: string }) {
  if (!ctx.embedded) return null;
  return (
    <div className={cn("flex items-center justify-center border border-dashed text-[10px] tracking-[0.3em] uppercase", className)} style={{ borderColor: C.accent, color: C.muted }}>
      {label}
    </div>
  );
}

function SectionTitle({ n, title, dark }: { n?: string; title: string; dark?: boolean }) {
  return (
    <div data-reveal className="flex items-baseline gap-4 border-b pb-3" style={{ borderColor: dark ? "rgb(255 255 255 / 0.2)" : C.ink }}>
      {n && (
        <span className="text-xs" style={{ color: C.accent }}>
          {n}
        </span>
      )}
      <h2 style={{ fontFamily: SERIF }} className="text-3xl @xl:text-5xl">
        {title}
      </h2>
    </div>
  );
}

/* ------------------------------------------------------------------------------------ */
/* Bloques                                                                               */
/* ------------------------------------------------------------------------------------ */

function Cover({ block, ctx }: BlockProps<"cover">) {
  const p = block.props;
  const marquee = lines(p.marquee);
  const items = marquee.length
    ? marquee
    : [
        "Save the date",
        ctx.day ? `${ctx.day.day} de ${ctx.day.monthName}` : "",
        ctx.city.split(",")[0],
        ctx.couple,
        prettyTime(ctx.start && ctx.day ? ctx.start : null),
      ].filter(Boolean);
  const hasPhoto = Boolean(p.photoUrl);
  return (
    <>
      <header
        className={cn("relative overflow-hidden", hasPhoto ? "text-white" : "ed-linen")}
        style={{ height: "var(--inv-screen)", minHeight: 560, background: hasPhoto ? "#2b301f" : undefined }}
      >
        {hasPhoto && (
          <>
            <Photo
              src={p.photoUrl}
              framing={p.framing.photoUrl}
              priority
              alt={ctx.couple}
              className={cn("absolute inset-0 h-full w-full object-cover", ctx.started ? "pp-ken" : "pp-ken-wait")}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#1f2316]/45 via-transparent to-[#1f2316]/75" />
          </>
        )}
        <div
          className="relative flex items-center justify-between border-b px-5 py-4 text-[10px] tracking-[0.35em] uppercase @xl:px-10"
          style={{ borderColor: hasPhoto ? "rgb(255 255 255 / 0.3)" : C.line }}
        >
          <span>{p.kicker}</span>
          <span>{ctx.day?.short ?? ""}</span>
        </div>
        {ctx.started && (
          <div className="absolute inset-x-0 bottom-0 px-5 pb-14 @xl:px-10">
            <p className="pp-rise text-xs tracking-[0.5em] uppercase" style={d(1)}>
              {p.headline}
            </p>
            <h1 style={{ fontFamily: SERIF }} className="mt-3 leading-[0.85]">
              <span className="pp-rise block italic @3xl:!text-[12rem]" style={{ ...d(2), fontSize: heroSize(ctx.p1 || "Nuestra", 92) }}>
                {ctx.p1 || "Nuestra"}
              </span>
              <span
                className="pp-rise block pl-[10cqw] @3xl:pl-40 @3xl:!text-[12rem]"
                style={{ ...d(3), fontSize: heroSize(`& ${ctx.p2 || "boda"}`, 82) }}
              >
                <span style={{ color: hasPhoto ? "#d8c99a" : C.accent }}>&amp;</span> {ctx.p2 || "boda"}
              </span>
            </h1>
            <div className="pp-line mt-6 h-px w-full" style={{ ...d(4), background: hasPhoto ? "rgb(255 255 255 / 0.5)" : C.ink }} />
            <div className="pp-rise mt-4 flex flex-wrap justify-between gap-2 text-[11px] tracking-[0.3em] uppercase" style={d(5)}>
              <span>{ctx.day?.long ?? ""}</span>
              <span>{ctx.city}</span>
            </div>
          </div>
        )}
      </header>
      {items.length > 0 && (
        <div className="overflow-hidden py-3" style={{ background: C.deep, color: C.cream }}>
          <div className="pp-marquee flex w-max gap-10 whitespace-nowrap" style={{ fontFamily: SERIF }}>
            {[0, 1].map((k) => (
              <span key={k} className="flex gap-10 text-2xl italic" aria-hidden={k === 1}>
                {items.map((t, i) => (
                  <span key={i} className="flex items-center gap-10">
                    {t} <span style={{ color: C.accent }}>✦</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Tamaño del nombre en la portada: 21cqw como máximo y más chico si el nombre es largo, para que
 * no se salga del ancho en el celular (≈0.55em por letra en Bodoni).
 */
function heroSize(text: string, availableCqw: number) {
  const size = Math.min(21, availableCqw / (0.55 * Math.max(text.length, 1)));
  return `${size.toFixed(2)}cqw`;
}

function FamilyList({ title, names }: { title: string; names: string[] }) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.35em] uppercase" style={{ color: C.accent }}>
        {title}
      </p>
      {names.map((n) => (
        <p key={n} className="mt-1 text-sm">
          {n}
        </p>
      ))}
    </div>
  );
}

function GuestMessage({ block, ctx }: BlockProps<"guestMessage">) {
  const p = block.props;
  const message = p.message.trim();
  const bride = lines(p.brideParents);
  const groom = lines(p.groomParents);
  const sponsors = lines(p.sponsors).map((l) => {
    const [role, ...rest] = l.split(":");
    return rest.length ? { role: role.trim(), names: rest.join(":").trim() } : { role: "", names: l };
  });
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-5 py-20 @xl:px-10 @3xl:grid-cols-[1fr_1.1fr] @3xl:items-center">
      {p.photoUrl ? (
        <figure data-reveal="clip" className="relative aspect-[3/4] overflow-hidden">
          <Photo src={p.photoUrl} framing={p.framing.photoUrl} sizes="(min-width: 768px) 45vw, 100vw" className="h-full w-full object-cover" />
          {p.caption && (
            <figcaption className="absolute bottom-3 left-3 px-2 py-1 text-[10px] tracking-[0.3em] uppercase" style={{ background: C.bg }}>
              {p.caption}
            </figcaption>
          )}
        </figure>
      ) : (
        <PhotoSlot ctx={ctx} label="Foto (Fig. 01)" className="aspect-[3/4]" />
      )}
      <div>
        {ctx.guest && (
          <>
            <p data-reveal className="text-[11px] tracking-[0.45em] uppercase" style={{ color: C.accent }}>
              Para
            </p>
            <p data-reveal className="mt-1 text-5xl leading-tight" style={{ fontFamily: SCRIPT, color: C.ink }}>
              {ctx.guest.fullName}
            </p>
          </>
        )}
        {message && (
          <p data-reveal style={{ fontFamily: SERIF, ...d(1) }} className="mt-6 text-[1.7rem] leading-snug @xl:text-4xl">
            <span className="float-left mt-1 mr-3 text-[5.2rem] leading-[0.8] italic">{message[0]}</span>
            {message.slice(1)}
          </p>
        )}
        {ctx.guest && p.showSeats && (
          <div data-reveal className="mt-8 flex items-center gap-4 border-y py-4" style={{ ...d(2), borderColor: C.line }}>
            <span className="text-5xl leading-none italic" style={{ fontFamily: SERIF }}>
              {ctx.guest.seats}
            </span>
            <p className="text-[11px] leading-relaxed tracking-[0.25em] uppercase" style={{ color: C.muted }}>
              {ctx.guest.seats === 1 ? "Lugar reservado" : "Lugares reservados"}
              <br />
              {ctx.guest.seats === 1 ? "para ti" : "para ti y tu compañía"}
            </p>
          </div>
        )}
        {(bride.length > 0 || groom.length > 0 || sponsors.length > 0) && (
          <div data-reveal className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5">
            {bride.length > 0 && <FamilyList title="Padres de la novia" names={bride} />}
            {groom.length > 0 && <FamilyList title="Padres del novio" names={groom} />}
            {sponsors.map((s, i) => (
              <FamilyList key={i} title={s.role || "Padrinos"} names={[s.names]} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Verse({ block }: BlockProps<"verse">) {
  const p = block.props;
  if (!p.text) return null;
  return (
    <section className="mx-auto max-w-3xl px-5 pb-20 @xl:px-10">
      <blockquote data-reveal className="border-l-2 pl-5" style={{ borderColor: C.ink }}>
        <span style={{ fontFamily: SERIF }} className="text-2xl leading-snug italic @xl:text-3xl">
          “{p.text}”
        </span>
        {p.reference && (
          <cite className="mt-3 block text-[10px] tracking-[0.35em] uppercase not-italic" style={{ color: C.muted }}>
            {p.reference}
          </cite>
        )}
      </blockquote>
    </section>
  );
}

function Countdown({ block, ctx }: BlockProps<"countdown">) {
  const { parts, done } = useCountdown(ctx.start);
  const p = block.props;
  return (
    <section className="border-y px-5 py-16 @xl:px-10" style={{ borderColor: C.line }}>
      <div className="mx-auto grid max-w-6xl items-center gap-10 @3xl:grid-cols-2">
        {ctx.day && (
          <div data-reveal="left" className="flex items-end gap-5">
            <span style={{ fontFamily: SERIF }} className="text-[9rem] leading-[0.75] font-medium @3xl:text-[14rem]">
              {ctx.day.day}
            </span>
            <div className="pb-3 text-sm tracking-[0.3em] uppercase">
              <p>{ctx.day.monthName}</p>
              <p style={{ color: C.muted }}>{ctx.day.weekday}</p>
              {ctx.start && (ctx.data.ceremonyTime || ctx.data.receptionTime) && <p className="mt-2 font-semibold">{prettyTime(ctx.start)}</p>}
            </div>
          </div>
        )}
        <div data-reveal="right">
          {done ? (
            <p style={{ fontFamily: SERIF }} className="text-4xl italic">
              ¡Hoy es el gran día!
            </p>
          ) : (
            <>
              <p className="text-[11px] tracking-[0.45em] uppercase" style={{ color: C.muted }}>
                {p.title}
              </p>
              <div className="mt-4 grid grid-cols-4 divide-x" style={{ borderColor: C.line }}>
                {parts.map((part) => (
                  <div key={part.label} className="px-2 text-center first:pl-0" style={{ borderColor: C.line }}>
                    <p style={{ fontFamily: SERIF }} className="text-4xl tabular-nums @xl:text-6xl">
                      {String(part.value).padStart(2, "0")}
                    </p>
                    <p className="mt-1 text-[10px] tracking-[0.3em] uppercase" style={{ color: C.muted }}>
                      {part.label}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
          {p.showCalendar && ctx.calendar && (
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
              <a
                href={ctx.calendar.google}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border-b border-current pb-1 text-xs tracking-[0.3em] uppercase transition hover:opacity-60"
              >
                <CalendarPlus className="size-4" /> Google Calendar
              </a>
              {ctx.calendar.ics && (
                <a href={ctx.calendar.ics} className="inline-flex items-center gap-2 border-b border-current pb-1 text-xs tracking-[0.3em] uppercase transition hover:opacity-60">
                  <CalendarPlus className="size-4" /> Apple / Outlook
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FeaturedPhoto({ block, ctx }: BlockProps<"featuredPhoto">) {
  const p = block.props;
  if (!p.photoUrl) return <PhotoSlot ctx={ctx} label="Foto destacada" className="mx-5 my-10 aspect-[4/5]" />;
  return (
    <figure data-reveal="clip" className="relative mx-auto aspect-[4/5] max-h-[90svh] w-full max-w-4xl overflow-hidden @3xl:aspect-[16/10]">
      <Photo src={p.photoUrl} framing={p.framing.photoUrl} className="h-full w-full object-cover" />
      {p.caption && (
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1f2316]/75 to-transparent px-5 pt-16 pb-6 text-white">
          <span style={{ fontFamily: SERIF }} className="text-2xl italic">
            {p.caption}
          </span>
        </figcaption>
      )}
    </figure>
  );
}

function Program({ block, ctx }: BlockProps<"program">) {
  const items = block.props.items.filter((i) => i.title);
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 @xl:px-10">
      <SectionTitle n={ctx.numbers[block.id]} title={block.props.title} />
      <ol className="mt-8">
        {items.map((it, i) => (
          <li
            key={i}
            data-reveal
            style={{ ...d(i % 4), borderColor: C.line }}
            className="grid grid-cols-[2rem_5.5rem_1fr] items-baseline gap-3 border-t py-4 @xl:grid-cols-[5rem_10rem_1fr] @xl:px-3"
          >
            <span className="text-xs" style={{ color: C.accent }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-[11px] tracking-[0.2em] uppercase">{it.time}</span>
            <span style={{ fontFamily: SERIF }} className="text-xl leading-snug @xl:text-4xl">
              {it.title}
            </span>
          </li>
        ))}
        {items.length === 0 && ctx.embedded && (
          <li className="border-t py-6 text-sm" style={{ borderColor: C.line, color: C.muted }}>
            Agrega los momentos del día en el panel del bloque.
          </li>
        )}
      </ol>
    </section>
  );
}

function Venue({ block, ctx }: { block: BlockOf<"ceremony"> | BlockOf<"reception">; ctx: Ctx }) {
  const p: EventProps = block.props;
  const iso = eventTimeToIso(p.time);
  const href = mapsLink(p.mapUrl, p.place, p.address);
  const when = iso ? [eventDay(iso, true)?.long, prettyTime(iso)].filter(Boolean).join(" · ") : "";
  return (
    <section style={{ background: C.deep, color: C.cream }}>
      <div className="mx-auto grid max-w-6xl @3xl:grid-cols-2">
        {p.photoUrl ? (
          <div data-reveal="clip" className="relative min-h-[340px] overflow-hidden">
            <Photo src={p.photoUrl} framing={p.framing.photoUrl} sizes="(min-width: 768px) 50vw, 100vw" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        ) : null}
        <div className="px-5 py-16 @xl:px-12">
          <SectionTitle n={ctx.numbers[block.id]} title={p.title} dark />
          {when && (
            <p data-reveal className="mt-8 text-[11px] tracking-[0.35em] uppercase opacity-70">
              {block.type === "ceremony" ? "Ceremonia" : "Recepción"} · {when}
            </p>
          )}
          {p.place && (
            <p data-reveal style={{ fontFamily: SERIF }} className="mt-3 text-4xl leading-tight italic @xl:text-5xl">
              {p.place}
            </p>
          )}
          {(p.address || p.note) && (
            <p data-reveal className="mt-3 text-sm opacity-70">
              {[p.address, p.note].filter(Boolean).join(" · ")}
            </p>
          )}
          {p.showMap && (p.place || p.address) && (
            <div data-reveal className="mt-8 aspect-video overflow-hidden border border-white/15">
              {ctx.embedded ? (
                <div className="flex h-full items-center justify-center text-[10px] tracking-[0.3em] uppercase opacity-60">
                  <MapPin className="mr-2 size-4" /> Mapa
                </div>
              ) : (
                <iframe title={`Mapa: ${p.place}`} src={mapEmbed(p.place, p.address)} className="h-full w-full" loading="lazy" />
              )}
            </div>
          )}
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 text-xs tracking-[0.3em] uppercase transition hover:opacity-85"
              style={{ background: C.cream, color: C.ink }}
            >
              <MapPin className="size-4" /> Cómo llegar <ArrowUpRight className="size-4" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function DressCode({ block, ctx }: BlockProps<"dressCode">) {
  const p = block.props;
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 @xl:px-10">
      <SectionTitle n={ctx.numbers[block.id]} title={p.title} />
      {p.code && (
        <p data-reveal style={{ fontFamily: SERIF }} className="mt-8 text-7xl italic">
          {p.code}
        </p>
      )}
      {p.note && (
        <p data-reveal className="mt-4 max-w-sm text-sm leading-relaxed" style={{ color: C.muted }}>
          {p.note}
        </p>
      )}
      {p.colors.length > 0 && (
        <div data-reveal className="mt-6 flex gap-3">
          {p.colors.map((c) => (
            <span key={c} className="size-10 rounded-full ring-1 ring-black/10" style={{ background: c }} />
          ))}
        </div>
      )}
      {p.showIcons && (
        <div data-reveal>
          <DressIcons
            color={C.ink}
            muted={C.muted}
            // Diseños anteriores sin colores elegidos: si la nota pide no usar verde, tonos de verde.
            avoidColors={p.avoidColors.length ? p.avoidColors : /verde/i.test(p.note) ? AVOID_GREENS : []}
            avoidLabel={p.avoidLabel || "Sin verde"}
            className="mt-8"
          />
        </div>
      )}
    </section>
  );
}

function Recommendations({ block, ctx }: BlockProps<"recommendations">) {
  const p = block.props;
  const items = lines(p.items);
  return (
    <section className="mx-auto max-w-6xl px-5 py-12 @xl:px-10">
      {p.adultsOnly && (
        <div data-reveal className="p-8 @xl:p-10" style={{ background: C.deep, color: C.cream }}>
          <p className="text-[11px] tracking-[0.45em] uppercase opacity-60">
            {[ctx.numbers[block.id], p.title].filter(Boolean).join(" — ")}
          </p>
          <p style={{ fontFamily: SERIF }} className="mt-6 text-6xl leading-none italic">
            Solo
            <br />
            adultos
          </p>
          {p.adultsOnlyText && <p className="mt-6 text-sm leading-relaxed opacity-80">{p.adultsOnlyText}</p>}
        </div>
      )}
      {items.length > 0 && (
        <div className={cn(p.adultsOnly && "mt-10")}>
          {!p.adultsOnly && <SectionTitle n={ctx.numbers[block.id]} title={p.title} />}
          <ul className="mt-6 space-y-3">
            {items.map((r, i) => (
              <li key={i} data-reveal style={d(i)} className="flex gap-3 text-base leading-relaxed">
                <span style={{ color: C.accent }}>✦</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Gallery({ block, ctx }: BlockProps<"gallery">) {
  const photos = block.props.photos;
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-5 @xl:px-10">
        <SectionTitle n={ctx.numbers[block.id]} title={block.props.title} />
      </div>
      {photos.length === 0 ? (
        <PhotoSlot ctx={ctx} label="Fotos de la galería" className="mx-5 mt-8 h-60" />
      ) : (
        <>
          <div className="pp-noscroll mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 @xl:px-10">
            {photos.map((src, i) => (
              <button
                type="button"
                key={src + i}
                onClick={() => ctx.openLightbox(photos, i)}
                className="group relative shrink-0 snap-center overflow-hidden"
                data-reveal="scale"
                style={d(i % 4)}
              >
                <Photo src={src} framing={block.props.framing[src]} sizes="(min-width: 768px) 40vw, 82vw" className="h-[58svh] max-h-[520px] w-auto max-w-[82cqw] object-cover transition duration-700 group-hover:scale-105" />
                <span className="absolute top-3 left-3 px-2 py-0.5 text-[10px] tracking-[0.2em]" style={{ background: C.bg }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-4 px-5 text-[10px] tracking-[0.3em] uppercase @xl:px-10" style={{ color: C.muted }}>
            Desliza · toca una foto para verla completa
          </p>
        </>
      )}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed border-black/15 pb-2">
      <dt style={{ color: C.muted }}>{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}

function Gifts({ block, ctx }: BlockProps<"gifts">) {
  const p = block.props;
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 @xl:px-10">
      <SectionTitle n={ctx.numbers[block.id]} title={p.title} />
      <div className="mt-8 grid gap-10 @3xl:grid-cols-[1.2fr_1fr]">
        {p.note && (
          <p data-reveal style={{ fontFamily: SERIF }} className="text-2xl leading-snug whitespace-pre-line @xl:text-3xl">
            {p.note}
          </p>
        )}
        {(p.account || p.registryUrl) && (
          <div data-reveal className="space-y-6">
            {p.account && (
              <div className="border p-6" style={{ borderColor: C.ink }}>
                <p className="text-[10px] tracking-[0.35em] uppercase" style={{ color: C.muted }}>
                  Transferencia
                </p>
                <dl className="mt-4 space-y-3 text-sm">
                  {p.bankName && <Row k="Banco" v={p.bankName} />}
                  <Row k="Cuenta" v={p.account} />
                  {p.holder && <Row k="Titular" v={p.holder} />}
                </dl>
                <CopyButton
                  value={p.account}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-[#343a26] py-3 text-xs tracking-[0.3em] text-[#f2eee3] uppercase transition hover:bg-[#a8996a]"
                >
                  Copiar cuenta
                </CopyButton>
              </div>
            )}
            {p.registryUrl && (
              <a
                href={p.registryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border-b border-current pb-1 text-xs tracking-[0.3em] uppercase"
              >
                <Gift className="size-4" /> Mesa de regalos <ArrowUpRight className="size-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

const SAMPLE_GUEST: InvitationGuestData = {
  fullName: "Invitado",
  seats: 2,
  plusOneNames: [],
  rsvpStatus: "pending",
  attendingCount: null,
  rsvpMessage: "",
  dietaryRestrictions: "",
  responded: false,
};

function Rsvp({ block, ctx }: BlockProps<"rsvp">) {
  const deadline = block.props.deadline ? `${block.props.deadline}T00:00:00.000Z` : null;
  return (
    <section className="border-t px-5 py-20 @xl:px-10" style={{ borderColor: C.line }}>
      <div className="mx-auto max-w-xl">
        <SectionTitle n={ctx.numbers[block.id]} title={block.props.title} />
        <div className="mt-8" data-reveal style={{ fontFamily: SANS }}>
          <RsvpSection guest={ctx.guest ?? SAMPLE_GUEST} token={ctx.token} rsvpDeadline={deadline} />
        </div>
      </div>
    </section>
  );
}

function Closing({ block, ctx }: BlockProps<"closing">) {
  const p = block.props;
  const hasPhoto = Boolean(p.photoUrl);
  return (
    <footer
      className={cn("relative overflow-hidden", hasPhoto ? "text-white" : "ed-linen")}
      style={{ height: hasPhoto ? "calc(var(--inv-screen) * 0.85)" : undefined, minHeight: hasPhoto ? 520 : undefined }}
    >
      {hasPhoto && (
        <>
          <Photo src={p.photoUrl} framing={p.framing.photoUrl} className="absolute inset-0 h-full w-full object-cover object-[50%_58%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1f2316]/85 via-[#1f2316]/25 via-45% to-transparent" />
        </>
      )}
      <div className={cn("relative flex flex-col items-center justify-end px-5 text-center", hasPhoto ? "h-full pb-20" : "py-24")}>
        {p.kicker && (
          <p data-reveal className="text-[11px] tracking-[0.4em] uppercase">
            {p.kicker}
          </p>
        )}
        <p data-reveal="blur" style={{ fontFamily: SERIF }} className="mt-6 text-5xl italic @xl:text-7xl">
          {p.message}
        </p>
        <p data-reveal className="mt-8 text-xs tracking-[0.5em] uppercase">
          {[ctx.couple, ctx.day?.short].filter(Boolean).join(" · ")}
        </p>
        {p.hashtag && (
          <p data-reveal className="mt-2 text-[11px] tracking-[0.3em] opacity-80">
            {p.hashtag}
          </p>
        )}
      </div>
    </footer>
  );
}

const RENDERERS: { [K in BlockType]: (p: BlockProps<K>) => ReactNode } = {
  cover: Cover,
  guestMessage: GuestMessage,
  verse: Verse,
  countdown: Countdown,
  featuredPhoto: FeaturedPhoto,
  program: Program,
  ceremony: Venue,
  reception: Venue,
  dressCode: DressCode,
  gallery: Gallery,
  gifts: Gifts,
  recommendations: Recommendations,
  rsvp: Rsvp,
  closing: Closing,
};

/** Bloques con título numerado ("02 — El programa"). */
const NUMBERED = new Set<BlockType>(["program", "ceremony", "reception", "dressCode", "recommendations", "gallery", "gifts", "rsvp"]);

function renderBlock(block: InvitationBlock, ctx: Ctx) {
  const Render = RENDERERS[block.type] as (p: { block: InvitationBlock; ctx: Ctx }) => ReactNode;
  return <Render block={block} ctx={ctx} />;
}

/** Datos efectivos: los de la boda + lo que dicen los bloques (horas, lugar, fecha límite…). */
export function effectiveData(data: InvitationData, design: InvitationDesign): InvitationData {
  return { ...data, ...projectDesign(design) };
}

export function InvitationView({ data, design: designProp, guest, token, embedded = false, started = true, selectedId, onSelectBlock }: InvitationViewProps) {
  const design = useMemo(() => designProp ?? designFromData(data), [designProp, data]);
  const visible = design.blocks.filter((b) => !b.hidden);
  const ref = useReveal(!embedded && started, visible.map((b) => b.id).join());
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  const fx = effectiveData(data, design);
  const timed = Boolean(fx.ceremonyTime || fx.receptionTime);
  const start = fx.ceremonyTime ?? fx.receptionTime ?? data.weddingDate;
  const numbers: Record<string, string> = {};
  let n = 0;
  for (const b of visible) if (NUMBERED.has(b.type)) numbers[b.id] = String(++n).padStart(2, "0");
  const p1 = data.partner1.trim();
  const p2 = data.partner2.trim();

  const ctx: Ctx = {
    data: fx,
    design,
    guest,
    token,
    embedded,
    started,
    p1,
    p2,
    initials: [p1[0], p2[0]].filter(Boolean).join(" & ").toUpperCase(),
    couple: [p1, p2].filter(Boolean).join(" & "),
    start,
    day: eventDay(start, timed),
    city: fx.ceremonyAddress || fx.receptionAddress || data.venueAddress,
    calendar: calendarLinks(fx, token),
    numbers,
    openLightbox: (images, index) => !onSelectBlock && setLightbox({ images, index }),
  };

  return (
    <div
      ref={ref}
      style={{ ...editorialStyle, background: C.bg, color: C.ink, fontFamily: SANS, "--inv-screen": embedded ? "720px" : "100svh" } as CSSProperties}
      className={cn("@container min-h-full overflow-x-clip", embedded && "pp-static")}
    >
      <EditorialFonts />
      {visible.map((block) =>
        onSelectBlock ? (
          <div
            key={block.id}
            data-block-id={block.id}
            title={BLOCK_INFO[block.type].label}
            className={cn("ed-block", selectedId === block.id && "is-selected")}
            onClickCapture={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelectBlock(block.id);
            }}
          >
            {renderBlock(block, ctx)}
          </div>
        ) : (
          <div key={block.id} data-block-id={block.id}>
            {renderBlock(block, ctx)}
          </div>
        )
      )}
      <p className="py-5 text-center text-[0.6rem] tracking-[0.2em] uppercase" style={{ color: C.muted }}>
        Invitación hecha con Wedplan
      </p>
      {!embedded && design.song.url && <SongButton url={design.song.url} title={design.song.title} />}
      <Lightbox
        images={lightbox?.images ?? []}
        index={lightbox?.index ?? null}
        onClose={() => setLightbox(null)}
        onIndex={(index) => setLightbox((l) => (l ? { ...l, index } : l))}
      />
    </div>
  );
}
