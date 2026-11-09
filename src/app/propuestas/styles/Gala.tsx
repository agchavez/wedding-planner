"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { CopyButton, Fonts, Lightbox, RsvpDemo, W, calendarUrl, photo, useCountdown, useReveal, useScrollY, type Guest } from "../shared";

const DISPLAY = "'Italiana', 'Cormorant Garamond', serif";
const SANS = "'Jost', system-ui, sans-serif";
const C = { bg: "#0d0c10", panel: "#16141a", ink: "#f1e9da", muted: "#9d9486", gold: "#cfae6b" };
const GALLERY = ["puerta-ancha", "puerta-beso", "puerta-abrazo", "puerta-retrato", "manos", "puerta-alta"].map(photo);

export function Gala({ guest }: { guest: Guest }) {
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [lb, setLb] = useState<number | null>(null);
  const ref = useReveal([open]);
  const y = useScrollY();
  const { parts } = useCountdown();
  const stars = useMemo(
    () => Array.from({ length: 46 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 61) % 100, s: 1 + (i % 3), d: (i % 7) * 0.45 })),
    []
  );

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % GALLERY.length), 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <div ref={ref} style={{ background: C.bg, color: C.ink, fontFamily: SANS }} className="min-h-svh overflow-x-clip">
      <Fonts families="family=Italiana&family=Jost:wght@300;400;500" />

      {/* Apertura: monograma que se dibuja */}
      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-all duration-1000 ${open ? "pointer-events-none scale-110 opacity-0" : ""}`}
        style={{ background: C.bg }}
      >
        {stars.map((s, i) => (
          <span
            key={i}
            className="pp-twinkle absolute rounded-full"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, background: C.gold, animationDelay: `${s.d}s` }}
          />
        ))}
        <button onClick={() => setOpen(true)} className="group relative flex flex-col items-center">
          <span className="relative block size-56">
          <svg viewBox="0 0 200 200" className="pp-draw in size-56">
            <circle cx="100" cy="100" r="92" fill="none" stroke={C.gold} strokeWidth="0.8" pathLength={1} />
            <circle cx="100" cy="100" r="84" fill="none" stroke={C.gold} strokeWidth="0.4" pathLength={1} />
            <path d="M100 40 L100 160" stroke={C.gold} strokeWidth="0.5" pathLength={1} />
          </svg>
          <span className="pp-fade absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-12 text-7xl" style={{ fontFamily: DISPLAY, animationDelay: "1s" }}>
            <span className="pp-shimmer">A</span>
            <span className="pp-shimmer">I</span>
          </span>
          </span>
          <span className="pp-fade mt-8 text-[11px] tracking-[0.6em] uppercase" style={{ color: C.muted, animationDelay: "1.6s" }}>
            {guest.name}
          </span>
          <span className="pp-fade pp-pulse mt-6 rounded-full border px-8 py-3 text-[11px] tracking-[0.5em] uppercase transition group-hover:bg-[#cfae6b] group-hover:text-black" style={{ borderColor: C.gold, color: C.gold, animationDelay: "2s" }}>
            Abrir
          </span>
        </button>
      </div>

      {/* Portada */}
      <header className="relative h-svh min-h-[640px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo("puerta-ancha")}
          alt="Angel e Indira"
          className={`absolute inset-0 h-full w-full object-cover object-[60%_center] ${open ? "pp-ken" : ""}`}
          style={{ transform: `translateY(${y * 0.35}px)` }}
        />
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${C.bg}cc 0%, transparent 35%, transparent 55%, ${C.bg} 100%)` }} />
        {open && (
          <div className="relative flex h-full flex-col items-center justify-end pb-24 text-center">
            <p className="pp-rise text-[11px] tracking-[0.6em] uppercase" style={{ color: C.gold, ["--d" as string]: 2 }}>
              {W.headline}
            </p>
            <h1 className="pp-rise mt-4 text-[17vw] leading-none sm:text-[9rem]" style={{ fontFamily: DISPLAY, ["--d" as string]: 3 }}>
              <span className="pp-shimmer">Angel &amp; Indira</span>
            </h1>
            <div className="pp-rise mt-6 flex items-center gap-4 text-xs tracking-[0.45em] uppercase" style={{ ["--d" as string]: 4 }}>
              <span className="h-px w-10" style={{ background: C.gold }} />
              12 · Diciembre · 2026
              <span className="h-px w-10" style={{ background: C.gold }} />
            </div>
          </div>
        )}
      </header>

      {/* Mensaje */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <Ornament />
        <p data-reveal="blur" className="mt-8 text-3xl leading-snug sm:text-4xl" style={{ fontFamily: DISPLAY }}>
          {W.message}
        </p>
        <p data-reveal className="mt-8 text-sm tracking-wide italic" style={{ color: C.muted }}>
          “{W.quote}”
        </p>
      </section>

      {/* Cuenta regresiva */}
      <section className="relative px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <Heading kicker="La cuenta regresiva" title={W.dateLong} />
          <div className="mt-12 grid grid-cols-4 gap-3 sm:gap-6">
            {parts.map((p, i) => (
              <div
                key={p.label}
                data-reveal="scale"
                style={{ ["--d" as string]: i, borderColor: `${C.gold}55` }}
                className="relative overflow-hidden rounded-xl border bg-white/[0.03] py-6 text-center backdrop-blur"
              >
                <p className="text-4xl tabular-nums sm:text-7xl" style={{ fontFamily: DISPLAY, color: C.gold }}>
                  {String(p.value).padStart(2, "0")}
                </p>
                <p className="mt-2 text-[10px] tracking-[0.4em] uppercase" style={{ color: C.muted }}>
                  {p.label}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center" data-reveal>
            <a
              href={calendarUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-[11px] tracking-[0.4em] text-black uppercase transition hover:brightness-110"
              style={{ background: C.gold }}
            >
              <CalendarPlus className="size-4" /> Agendar
            </a>
          </div>
        </div>
      </section>

      {/* Programa */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <Heading kicker="Itinerario" title="La noche" />
          <ol className="mt-14 space-y-2">
            {W.itinerary.map((it, i) => (
              <li
                key={it.title}
                data-reveal
                style={{ ["--d" as string]: i % 4 }}
                className="group flex items-center gap-5 rounded-lg px-4 py-4 transition hover:bg-white/[0.04]"
              >
                <span className="w-20 shrink-0 text-right text-sm tracking-widest" style={{ color: C.gold }}>
                  {it.time}
                </span>
                <span className="size-2 shrink-0 rotate-45 border transition group-hover:bg-[#cfae6b]" style={{ borderColor: C.gold }} />
                <span className="text-2xl sm:text-3xl" style={{ fontFamily: DISPLAY }}>
                  {it.title}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Lugar */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border" style={{ borderColor: `${C.gold}40`, background: C.panel }}>
          <div className="grid md:grid-cols-2">
            <div className="p-8 sm:p-12">
              <Heading kicker={W.venueKind} title="La Hacienda" left />
              <p data-reveal className="mt-3 text-3xl" style={{ fontFamily: DISPLAY, color: C.gold }}>
                El Encanto de Jeto
              </p>
              <p data-reveal className="mt-4 text-sm leading-relaxed" style={{ color: C.muted }}>
                {W.city}. Ceremonia a las {W.time}; la recepción continúa en el mismo lugar.
              </p>
              <ul data-reveal className="mt-6 space-y-2 text-sm" style={{ color: C.muted }}>
                {W.recommendations.map((r) => (
                  <li key={r}>— {r}</li>
                ))}
              </ul>
              <a
                data-reveal
                href={W.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-flex items-center gap-2 rounded-full border px-6 py-3 text-[11px] tracking-[0.4em] uppercase transition hover:bg-[#cfae6b] hover:text-black"
                style={{ borderColor: C.gold, color: C.gold }}
              >
                <MapPin className="size-4" /> Cómo llegar
              </a>
            </div>
            <div data-reveal className="min-h-[320px]">
              <iframe title="Mapa" src={W.mapEmbed} className="h-full min-h-[320px] w-full [filter:grayscale(1)_invert(.92)_sepia(.2)]" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* Vestimenta y solo adultos */}
      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          <div data-reveal className="rounded-2xl border p-8 sm:p-10" style={{ borderColor: `${C.gold}40`, background: C.panel }}>
            <p className="text-[11px] tracking-[0.5em] uppercase" style={{ color: C.gold }}>
              Código de vestimenta
            </p>
            <p className="mt-4 text-6xl" style={{ fontFamily: DISPLAY }}>
              Formal
            </p>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: C.muted }}>
              {W.dressNote}
            </p>
            <div className="mt-8 flex -space-x-3">
              {W.dressPalette.map((c, i) => (
                <span key={c.hex} title={c.name} className="size-12 rounded-full ring-2 transition hover:-translate-y-2" style={{ background: c.hex, ["--tw-ring-color" as string]: C.gold, zIndex: 5 - i }} />
              ))}
            </div>
          </div>
          <div data-reveal style={{ ["--d" as string]: 1, borderColor: `${C.gold}40`, background: C.panel }} className="flex flex-col items-center justify-center rounded-2xl border p-8 text-center sm:p-10">
            <div className="flex size-28 items-center justify-center rounded-full border-2" style={{ borderColor: C.gold }}>
              <span className="text-4xl" style={{ fontFamily: DISPLAY, color: C.gold }}>
                +18
              </span>
            </div>
            <p className="mt-6 text-3xl" style={{ fontFamily: DISPLAY }}>
              Una noche solo para adultos
            </p>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: C.muted }}>
              {W.adultsOnly}
            </p>
          </div>
        </div>
      </section>

      {/* Galería en carrusel */}
      <section className="py-20">
        <Heading kicker="Recuerdos" title="Nosotros" />
        <div className="relative mx-auto mt-12 h-[58svh] max-h-[560px] max-w-5xl">
          {GALLERY.map((src, i) => {
            const off = ((i - slide + GALLERY.length + 2) % GALLERY.length) - 2;
            const visible = Math.abs(off) <= 1;
            return (
              <button
                key={src}
                onClick={() => (off === 0 ? setLb(i) : setSlide(i))}
                className="absolute top-0 left-1/2 h-full w-[68vw] max-w-[380px] overflow-hidden rounded-2xl shadow-2xl transition-all duration-700"
                style={{
                  transform: `translateX(calc(-50% + ${off * 62}%)) scale(${off === 0 ? 1 : 0.8})`,
                  opacity: visible ? (off === 0 ? 1 : 0.35) : 0,
                  zIndex: 10 - Math.abs(off),
                  pointerEvents: visible ? "auto" : "none",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            );
          })}
        </div>
        <div className="mt-8 flex items-center justify-center gap-6">
          <button aria-label="Anterior" onClick={() => setSlide((s) => (s - 1 + GALLERY.length) % GALLERY.length)} className="rounded-full border p-2" style={{ borderColor: `${C.gold}66`, color: C.gold }}>
            <ChevronLeft className="size-5" />
          </button>
          <div className="flex gap-2">
            {GALLERY.map((_, i) => (
              <span key={i} className="h-1 rounded-full transition-all" style={{ width: i === slide ? 24 : 8, background: i === slide ? C.gold : `${C.gold}44` }} />
            ))}
          </div>
          <button aria-label="Siguiente" onClick={() => setSlide((s) => (s + 1) % GALLERY.length)} className="rounded-full border p-2" style={{ borderColor: `${C.gold}66`, color: C.gold }}>
            <ChevronRight className="size-5" />
          </button>
        </div>
      </section>

      {/* Regalos */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Heading kicker="Mesa de regalos" title="Lluvia de sobres" />
          <p data-reveal className="mt-6 leading-relaxed" style={{ color: C.muted }}>
            {W.gifts}
          </p>
          <div
            data-reveal
            className="mx-auto mt-10 max-w-sm rounded-2xl p-[1px]"
            style={{ background: `linear-gradient(135deg, ${C.gold}, transparent 40%, transparent 60%, ${C.gold})` }}
          >
            <div className="rounded-2xl p-7" style={{ background: C.panel }}>
              <p className="text-[10px] tracking-[0.5em] uppercase" style={{ color: C.muted }}>
                {W.bank.bank}
              </p>
              <p className="mt-3 text-3xl tracking-widest" style={{ fontFamily: DISPLAY, color: C.gold }}>
                {W.bank.account}
              </p>
              <p className="mt-2 text-sm">{W.bank.holder}</p>
              <CopyButton
                value={W.bank.account}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#cfae6b] px-6 py-2.5 text-[11px] tracking-[0.35em] text-black uppercase transition hover:brightness-110"
              >
                Copiar
              </CopyButton>
            </div>
          </div>
        </div>
      </section>

      {/* RSVP */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-lg rounded-2xl border p-8 sm:p-10" style={{ borderColor: `${C.gold}40`, background: C.panel }}>
          <Heading kicker={`Confirma antes del ${W.rsvpBy}`} title="R.S.V.P." />
          <div className="mt-8" data-reveal>
            <RsvpDemo
              guest={guest}
              skin={{
                wrap: "",
                label: "text-[11px] tracking-[0.35em] uppercase text-[#cfae6b]",
                input: "w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-[#f1e9da] outline-none focus:border-[#cfae6b]",
                choice: "rounded-lg border border-white/15 py-4 text-sm tracking-wider transition hover:border-[#cfae6b]",
                choiceOn: "!border-[#cfae6b] !bg-[#cfae6b] text-black",
                button: "rounded-full bg-[#cfae6b] py-4 text-[11px] tracking-[0.45em] text-black uppercase transition hover:brightness-110",
                note: "text-sm text-[#9d9486]",
              }}
            />
          </div>
        </div>
      </section>

      {/* Cierre */}
      <footer className="relative overflow-hidden px-6 py-32 text-center">
        {stars.slice(0, 24).map((s, i) => (
          <span key={i} className="pp-twinkle absolute rounded-full" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, background: C.gold, animationDelay: `${s.d}s` }} />
        ))}
        <Ornament />
        <p data-reveal="blur" className="mt-8 text-5xl sm:text-6xl" style={{ fontFamily: DISPLAY }}>
          {W.closing}
        </p>
        <p data-reveal className="mt-8 text-[11px] tracking-[0.6em] uppercase" style={{ color: C.gold }}>
          A &amp; I · 12.12.2026
        </p>
      </footer>

      <Lightbox images={GALLERY} index={lb} onClose={() => setLb(null)} onIndex={setLb} />
    </div>
  );
}

function Heading({ kicker, title, left }: { kicker: string; title: string; left?: boolean }) {
  return (
    <div className={left ? "" : "text-center"}>
      <p data-reveal className="text-[11px] tracking-[0.5em] uppercase" style={{ color: C.gold }}>
        {kicker}
      </p>
      <h2 data-reveal className="mt-3 text-4xl sm:text-6xl" style={{ fontFamily: DISPLAY, ["--d" as string]: 1 }}>
        {title}
      </h2>
    </div>
  );
}

function Ornament() {
  return (
    <div data-reveal className="flex items-center justify-center gap-3" style={{ color: C.gold }}>
      <span className="h-px w-16 bg-current" />
      <span className="size-1.5 rotate-45 bg-current" />
      <span className="h-px w-16 bg-current" />
    </div>
  );
}
