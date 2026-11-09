"use client";

import { useState } from "react";
import { ArrowUpRight, CalendarPlus, MapPin } from "lucide-react";
import { CopyButton, Fonts, Lightbox, RsvpDemo, W, calendarUrl, photo, useCountdown, useReveal, useScrollY, type Guest } from "../shared";

const SERIF = "'Bodoni Moda', 'Didot', serif";
const SANS = "'Inter', system-ui, sans-serif";
const C = { bg: "#f2eee3", ink: "#343a26", muted: "#757359", line: "#d9d4c1", accent: "#a8996a" };
const GALLERY = ["c-risa", "c-sombrilla", "c-abrazo", "c-picnic", "c-alzar", "c-mirada", "c-anillo2", "c-banca", "c-anillo3"].map(photo);

export function Editorial({ guest }: { guest: Guest }) {
  const [open, setOpen] = useState(false);
  const [lb, setLb] = useState<number | null>(null);
  const ref = useReveal([open]);
  const y = useScrollY();
  const { parts } = useCountdown();

  return (
    <div ref={ref} style={{ background: C.bg, color: C.ink, fontFamily: SANS }} className="min-h-svh overflow-x-clip">
      <Fonts families="family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=Inter:wght@300;400;500;600" />

      {/* Telón de apertura */}
      <div className={`pp-curtain fixed inset-0 z-50 ${open ? "open pointer-events-none" : ""}`}>
        <div className="absolute inset-x-0 top-0 flex h-1/2 items-end justify-center bg-[#343a26] pb-6 text-[#f2eee3]">
          <p style={{ fontFamily: SERIF }} className="text-7xl italic sm:text-8xl">
            A <span className="text-[#a8996a]">&amp;</span> I
          </p>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex h-1/2 flex-col items-center justify-start gap-6 bg-[#343a26] pt-4 text-[#f2eee3]">
          <p className="text-[11px] tracking-[0.5em] uppercase opacity-70">Edición especial · 12.12.2026</p>
          <p className="text-sm opacity-80">Para {guest.name}</p>
          <button
            onClick={() => setOpen(true)}
            className="pp-pulse mt-2 rounded-full border border-[#f2eee3]/40 px-7 py-3 text-xs tracking-[0.35em] uppercase transition hover:bg-[#f2eee3] hover:text-[#343a26]"
          >
            Abrir invitación
          </button>
        </div>
      </div>

      {/* Portada */}
      <header className="relative h-svh min-h-[620px] overflow-hidden bg-black text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo("c-beso")}
          alt="Angel e Indira"
          className={`absolute inset-0 h-full w-full object-cover opacity-90 ${open ? "pp-ken" : ""}`}
          style={{ transform: `translateY(${y * 0.25}px)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
        <div className="relative flex items-center justify-between border-b border-white/30 px-5 py-4 text-[10px] tracking-[0.35em] uppercase sm:px-10">
          <span>Vol. 01</span>
          <span className="hidden sm:inline">La boda del año</span>
          <span>12.12.26</span>
        </div>
        {open && (
          <div className="absolute inset-x-0 bottom-0 px-5 pb-14 sm:px-10">
            <p className="pp-rise text-xs tracking-[0.5em] uppercase" style={{ ["--d" as string]: 1 }}>
              {W.headline}
            </p>
            <h1 style={{ fontFamily: SERIF }} className="mt-3 leading-[0.85]">
              <span className="pp-rise block text-[22vw] italic sm:text-[12rem]" style={{ ["--d" as string]: 2 }}>
                Angel
              </span>
              <span className="pp-rise block pl-[12vw] text-[22vw] sm:pl-40 sm:text-[12rem]" style={{ ["--d" as string]: 3 }}>
                <span className="text-[#d8c99a]">&amp;</span> Indira
              </span>
            </h1>
            <div className="pp-line mt-6 h-px w-full bg-white/50" style={{ ["--d" as string]: 4 }} />
            <div className="pp-rise mt-4 flex flex-wrap justify-between gap-2 text-xs tracking-[0.3em] uppercase" style={{ ["--d" as string]: 5 }}>
              <span>{W.dateLong}</span>
              <span>{W.city}</span>
            </div>
          </div>
        )}
      </header>

      {/* Marquesina */}
      <div className="overflow-hidden border-y border-[#343a26] bg-[#343a26] py-3 text-[#f2eee3]">
        <div className="pp-marquee flex w-max gap-10 whitespace-nowrap" style={{ fontFamily: SERIF }}>
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} className="flex gap-10 text-2xl italic">
              {["Save the date", "12 de diciembre", "Comayagua", "Angel & Indira", "3:30 pm", "Solo adultos"].map((t) => (
                <span key={t} className="flex items-center gap-10">
                  {t} <span className="text-[#a8996a]">✦</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Carta */}
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-24 sm:px-10 md:grid-cols-[1fr_1.1fr] md:items-center">
        <figure data-reveal="clip" className="relative aspect-[3/4] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo("c-bugambilia")} alt="" className="h-full w-full object-cover" />
          <figcaption className="absolute bottom-3 left-3 bg-[#f2eee3] px-2 py-1 text-[10px] tracking-[0.3em] uppercase">Fig. 01 — Nosotros</figcaption>
        </figure>
        <div>
          <p data-reveal className="text-[11px] tracking-[0.45em] uppercase" style={{ color: C.accent }}>
            Para {guest.name}
          </p>
          <p data-reveal style={{ fontFamily: SERIF, ["--d" as string]: 1 }} className="mt-6 text-3xl leading-snug sm:text-4xl">
            <span className="float-left mr-3 text-8xl leading-[0.8] italic">N</span>
            os encantaría que nos acompañes en este día tan especial y que nos bendigas con tu presencia y tus oraciones.
          </p>
          <blockquote data-reveal style={{ ["--d" as string]: 2, borderColor: C.ink }} className="mt-10 border-l-2 pl-5 text-sm leading-relaxed" >
            <span style={{ fontFamily: SERIF }} className="text-xl italic">“{W.quote}”</span>
          </blockquote>
        </div>
      </section>

      {/* Fecha */}
      <section className="border-y px-5 py-20 sm:px-10" style={{ borderColor: C.line }}>
        <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
          <div data-reveal="left" className="flex items-end gap-5">
            <span style={{ fontFamily: SERIF }} className="text-[10rem] leading-[0.75] font-medium sm:text-[14rem]">
              12
            </span>
            <div className="pb-3 text-sm tracking-[0.3em] uppercase">
              <p>Diciembre</p>
              <p style={{ color: C.muted }}>Sábado</p>
              <p className="mt-2 font-semibold">{W.time}</p>
            </div>
          </div>
          <div data-reveal="right">
            <p className="text-[11px] tracking-[0.45em] uppercase" style={{ color: C.muted }}>
              Faltan
            </p>
            <div className="mt-4 grid grid-cols-4 divide-x" style={{ borderColor: C.line }}>
              {parts.map((p) => (
                <div key={p.label} className="px-2 text-center first:pl-0" style={{ borderColor: C.line }}>
                  <p style={{ fontFamily: SERIF }} className="text-4xl tabular-nums sm:text-6xl">
                    {String(p.value).padStart(2, "0")}
                  </p>
                  <p className="mt-1 text-[10px] tracking-[0.3em] uppercase" style={{ color: C.muted }}>
                    {p.label}
                  </p>
                </div>
              ))}
            </div>
            <a
              href={calendarUrl()}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex items-center gap-2 border-b border-current pb-1 text-xs tracking-[0.3em] uppercase transition hover:opacity-60"
            >
              <CalendarPlus className="size-4" /> Agregar al calendario
            </a>
          </div>
        </div>
      </section>

      {/* Programa */}
      <section className="mx-auto max-w-6xl px-5 py-24 sm:px-10">
        <SectionTitle n="02" title="El programa" />
        <ol className="mt-10">
          {W.itinerary.map((it, i) => (
            <li
              key={it.title}
              data-reveal
              style={{ ["--d" as string]: i % 4, borderColor: C.line }}
              className="group grid grid-cols-[3rem_6rem_1fr] items-baseline gap-3 border-t py-5 transition-colors hover:bg-[#343a26] hover:text-[#f2eee3] sm:grid-cols-[5rem_10rem_1fr] sm:px-3"
            >
              <span className="text-xs" style={{ color: C.accent }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-xs tracking-[0.25em] uppercase">{it.time}</span>
              <span style={{ fontFamily: SERIF }} className="text-2xl sm:text-4xl">
                {it.title}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Lugar */}
      <section className="bg-[#343a26] text-[#f2eee3]">
        <div className="mx-auto grid max-w-6xl md:grid-cols-2">
          <div data-reveal="clip" className="relative min-h-[420px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo("c-arco")} alt="" className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <div className="px-5 py-16 sm:px-12">
            <SectionTitle n="03" title="El lugar" dark />
            <p data-reveal className="mt-8 text-[11px] tracking-[0.4em] uppercase opacity-60">
              {W.venueKind}
            </p>
            <p data-reveal style={{ fontFamily: SERIF }} className="mt-2 text-4xl leading-tight italic sm:text-5xl">
              La Hacienda El Encanto de Jeto
            </p>
            <p data-reveal className="mt-3 text-sm opacity-70">
              {W.city} · Ceremonia y recepción
            </p>
            <div data-reveal className="mt-8 aspect-video overflow-hidden border border-white/15">
              <iframe title="Mapa" src={W.mapEmbed} className="h-full w-full grayscale" loading="lazy" />
            </div>
            <a
              href={W.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 bg-[#f2eee3] px-6 py-3 text-xs tracking-[0.3em] text-[#343a26] uppercase transition hover:bg-[#a8996a]"
            >
              <MapPin className="size-4" /> Cómo llegar <ArrowUpRight className="size-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Vestimenta + solo adultos */}
      <section className="mx-auto grid max-w-6xl gap-16 px-5 py-24 sm:px-10 md:grid-cols-2">
        <div>
          <SectionTitle n="04" title="Vestimenta" />
          <p data-reveal style={{ fontFamily: SERIF }} className="mt-8 text-7xl italic">
            Formal
          </p>
          <p data-reveal className="mt-4 max-w-sm text-sm leading-relaxed" style={{ color: C.muted }}>
            {W.dressNote}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            {W.dressPalette.map((c, i) => (
              <div key={c.hex} data-reveal="scale" style={{ ["--d" as string]: i }} className="text-center">
                <div className="size-14 rounded-full ring-1 ring-black/10" style={{ background: c.hex }} />
                <p className="mt-2 text-[10px] tracking-[0.15em] uppercase" style={{ color: C.muted }}>
                  {c.name}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div data-reveal className="flex flex-col justify-between bg-[#343a26] p-8 text-[#f2eee3] sm:p-10">
          <p className="text-[11px] tracking-[0.45em] uppercase opacity-60">05 — Nota importante</p>
          <p style={{ fontFamily: SERIF }} className="mt-6 text-6xl leading-none italic">
            Solo
            <br />
            adultos
          </p>
          <p className="mt-6 text-sm leading-relaxed opacity-80">{W.adultsOnly}</p>
        </div>
      </section>

      {/* Galería */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-10">
          <SectionTitle n="06" title="Portafolio" />
        </div>
        <div className="pp-noscroll mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 sm:px-10">
          {GALLERY.map((src, i) => (
            <button key={src} onClick={() => setLb(i)} className="group relative shrink-0 snap-start overflow-hidden" data-reveal="scale" style={{ ["--d" as string]: i % 4 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" className="h-[60svh] max-h-[520px] w-auto object-cover transition duration-700 group-hover:scale-105" />
              <span className="absolute top-3 left-3 bg-[#f2eee3] px-2 py-0.5 text-[10px] tracking-[0.2em]">{String(i + 1).padStart(2, "0")}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 px-5 text-[10px] tracking-[0.3em] uppercase sm:px-10" style={{ color: C.muted }}>
          Desliza · toca una foto para verla completa
        </p>
      </section>

      {/* Regalos */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-10">
        <SectionTitle n="07" title="Regalos" />
        <div className="mt-10 grid gap-10 md:grid-cols-[1.2fr_1fr]">
          <p data-reveal style={{ fontFamily: SERIF }} className="text-2xl leading-snug sm:text-3xl">
            {W.gifts}
          </p>
          <div data-reveal className="border p-6" style={{ borderColor: C.ink }}>
            <p className="text-[10px] tracking-[0.35em] uppercase" style={{ color: C.muted }}>
              Transferencia
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <Row k="Banco" v={W.bank.bank} />
              <Row k="Cuenta" v={W.bank.account} />
              <Row k="Titular" v={W.bank.holder} />
            </dl>
            <CopyButton
              value={W.bank.account}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-[#343a26] py-3 text-xs tracking-[0.3em] text-[#f2eee3] uppercase transition hover:bg-[#a8996a]"
            >
              Copiar cuenta
            </CopyButton>
          </div>
        </div>
      </section>

      {/* RSVP */}
      <section className="border-t px-5 py-24 sm:px-10" style={{ borderColor: C.line }}>
        <div className="mx-auto max-w-xl">
          <SectionTitle n="08" title="Confirma tu asistencia" />
          <div className="mt-10" data-reveal>
            <RsvpDemo
              guest={guest}
              skin={{
                wrap: "",
                label: "text-[11px] tracking-[0.3em] uppercase",
                input: "w-full border-0 border-b border-[#343a26] bg-transparent px-0 py-2 text-base outline-none focus:border-[#a8996a]",
                choice: "border border-[#343a26] py-4 text-xs tracking-[0.25em] uppercase transition hover:bg-[#343a26]/5",
                choiceOn: "!bg-[#343a26] text-[#f2eee3]",
                button: "bg-[#343a26] py-4 text-xs tracking-[0.35em] text-[#f2eee3] uppercase transition hover:bg-[#a8996a]",
                note: "text-sm text-[#757359]",
              }}
            />
          </div>
        </div>
      </section>

      {/* Cierre */}
      <footer className="relative h-[85svh] overflow-hidden text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo("c-anillo")} alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_58%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1f2316]/85 via-[#1f2316]/25 via-45% to-transparent" />
        <div className="relative flex h-full flex-col items-center justify-end px-5 pb-24 text-center">
          <p data-reveal className="text-[11px] tracking-[0.5em] uppercase">
            {W.recommendations[0]}
          </p>
          <p data-reveal="blur" style={{ fontFamily: SERIF }} className="mt-6 text-5xl italic sm:text-7xl">
            {W.closing}
          </p>
          <p data-reveal className="mt-8 text-xs tracking-[0.5em] uppercase">
            Angel &amp; Indira · 12.12.26
          </p>
        </div>
      </footer>

      <Lightbox images={GALLERY} index={lb} onClose={() => setLb(null)} onIndex={setLb} />
    </div>
  );
}

function SectionTitle({ n, title, dark }: { n: string; title: string; dark?: boolean }) {
  return (
    <div data-reveal className="flex items-baseline gap-4 border-b pb-3" style={{ borderColor: dark ? "rgb(255 255 255 / 0.2)" : C.ink }}>
      <span className="text-xs" style={{ color: C.accent }}>
        {n}
      </span>
      <h2 style={{ fontFamily: SERIF }} className="text-3xl sm:text-5xl">
        {title}
      </h2>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed border-black/15 pb-2">
      <dt className="text-[#757359]">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
