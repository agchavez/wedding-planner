"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import { CopyButton, Fonts, Lightbox, RsvpDemo, W, calendarUrl, photo, useCountdown, useReveal, type Guest } from "../shared";

const SERIF = "'Instrument Serif', Georgia, serif";
const SANS = "'Manrope', system-ui, sans-serif";
const C = { bg: "#faf8f4", ink: "#1c1b19", muted: "#8a8478", line: "#e6e1d7", accent: "#b39b74" };
const GALLERY = ["retrato2-bn", "manos2-bn", "caminata-bn", "banca-bn", "atardecer-bn", "puerta-alta-bn"].map(photo);

export function Minimal({ guest }: { guest: Guest }) {
  const [intro, setIntro] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [faq, setFaq] = useState<number | null>(0);
  const [lb, setLb] = useState<number | null>(null);
  const ref = useReveal([intro]);
  const { parts } = useCountdown();

  useEffect(() => {
    const id = setTimeout(() => setIntro(false), 2600);
    return () => clearTimeout(id);
  }, []);

  const details = [
    { q: "¿Cómo debo vestir?", a: <><p><strong>Formal.</strong> {W.dressNote}</p><div className="mt-4 flex gap-2">{W.dressPalette.map((c) => (<span key={c.hex} className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs" style={{ borderColor: C.line }}><span className="size-3 rounded-full" style={{ background: c.hex }} />{c.name}</span>))}</div></> },
    { q: "¿Puedo llevar a mis hijos?", a: <p>{W.adultsOnly}</p> },
    { q: "¿Qué les puedo regalar?", a: <><p>{W.gifts}</p><div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4" style={{ borderColor: C.line }}><div className="text-xs leading-relaxed"><p style={{ color: C.muted }}>{W.bank.bank} · {W.bank.holder}</p><p className="text-base tracking-wider">{W.bank.account}</p></div><CopyButton value={W.bank.account} className="inline-flex items-center gap-2 rounded-full bg-[#1c1b19] px-4 py-2 text-xs text-white">Copiar</CopyButton></div></> },
    { q: "¿A qué hora debo llegar?", a: <p>La ceremonia empieza a las {W.time}. {W.recommendations.join(" ")}</p> },
  ];

  return (
    <div ref={ref} style={{ background: C.bg, color: C.ink, fontFamily: SANS }} className="min-h-svh overflow-x-clip">
      <Fonts families="family=Instrument+Serif:ital@0;1&family=Manrope:wght@300;400;500;600" />

      {/* Intro: una línea que se dibuja */}
      <div
        onClick={() => setIntro(false)}
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 transition-all duration-1000 ${intro ? "" : "pointer-events-none -translate-y-full"}`}
        style={{ background: C.bg }}
      >
        <p className="pp-fade text-xs tracking-[0.4em] uppercase" style={{ color: C.muted, animationDelay: ".2s" }}>
          Para {guest.name}
        </p>
        <div className="pp-line h-px w-48" style={{ background: C.ink }} />
        <p className="pp-fade text-5xl italic" style={{ fontFamily: SERIF, animationDelay: ".9s" }}>
          Angel &amp; Indira
        </p>
      </div>

      {/* Portada */}
      <header key={intro ? "intro" : "ready"} className="mx-auto grid min-h-svh max-w-6xl grid-rows-[auto_1fr_auto] px-5 py-6 sm:px-10">
        <nav className="flex justify-between text-xs" style={{ color: C.muted }}>
          <span>A — I</span>
          <span>12.12.2026</span>
        </nav>
        <div className="grid items-center gap-10 py-10 md:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="pp-rise text-sm" style={{ color: C.muted, ["--d" as string]: 6 }}>
              {W.headline}
            </p>
            <h1 className="mt-4 text-[19vw] leading-[0.85] md:text-[9.5rem]" style={{ fontFamily: SERIF }}>
              <span className="pp-rise block" style={{ ["--d" as string]: 7 }}>
                Angel
              </span>
              <span className="pp-rise block italic" style={{ ["--d" as string]: 8, color: C.accent }}>
                &amp; Indira
              </span>
            </h1>
          </div>
          <div className="pp-rise relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-[999px_999px_24px_24px]" style={{ ["--d" as string]: 9 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo("retrato2-bn")} alt="Angel e Indira" className="h-full w-full object-cover" />
          </div>
        </div>
        <div className="flex items-end justify-between border-t pt-4 text-xs" style={{ borderColor: C.line, color: C.muted }}>
          <span>{W.venue}</span>
          <span className="pp-bob">Desliza ↓</span>
        </div>
      </header>

      {/* (01) Tarjeta giratoria */}
      <section className="mx-auto max-w-6xl px-5 py-24 sm:px-10">
        <Label n="01" t="Guarda la fecha" />
        <div className="mt-10 grid items-center gap-12 md:grid-cols-2">
          <p data-reveal className="max-w-md text-3xl leading-snug sm:text-4xl" style={{ fontFamily: SERIF }}>
            {W.message}
          </p>
          <button data-reveal="scale" onClick={() => setFlipped((f) => !f)} className={`pp-flip mx-auto block aspect-[4/5] w-full max-w-xs ${flipped ? "flipped" : ""}`}>
            <div className="pp-flip-inner relative h-full w-full">
              <div className="pp-flip-face absolute inset-0 flex flex-col items-center justify-center rounded-2xl border bg-white shadow-sm" style={{ borderColor: C.line }}>
                <p className="text-xs tracking-[0.35em] uppercase" style={{ color: C.muted }}>
                  Save the date
                </p>
                <p className="mt-4 text-7xl" style={{ fontFamily: SERIF }}>
                  12.12
                </p>
                <p className="text-lg italic" style={{ fontFamily: SERIF, color: C.accent }}>
                  dos mil veintiséis
                </p>
                <p className="mt-10 flex items-center gap-1 text-[11px]" style={{ color: C.muted }}>
                  <Plus className="size-3" /> Toca para girar
                </p>
              </div>
              <div className="pp-flip-face pp-flip-back absolute inset-0 flex flex-col justify-between rounded-2xl p-7 text-left text-white" style={{ background: C.ink }}>
                <p className="text-xs tracking-[0.35em] uppercase opacity-60">Detalles</p>
                <div className="space-y-4 text-sm">
                  <p>
                    <span className="block text-2xl" style={{ fontFamily: SERIF }}>Sábado 12 de diciembre</span>
                    <span className="opacity-60">2026 · {W.time}</span>
                  </p>
                  <p>
                    <span className="block text-2xl" style={{ fontFamily: SERIF }}>La Hacienda</span>
                    <span className="opacity-60">El Encanto de Jeto, Comayagua</span>
                  </p>
                </div>
                <a href={calendarUrl()} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center justify-between border-t border-white/20 pt-4 text-xs">
                  Agregar al calendario <ArrowUpRight className="size-4" />
                </a>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* (02) Cuenta regresiva */}
      <section className="border-y" style={{ borderColor: C.line }}>
        <div className="mx-auto grid max-w-6xl grid-cols-2 sm:grid-cols-4">
          {parts.map((p, i) => (
            <div key={p.label} data-reveal style={{ ["--d" as string]: i, borderColor: C.line }} className="border-r px-5 py-10 last:border-r-0 sm:px-10 [&:nth-child(2)]:border-r-0 sm:[&:nth-child(2)]:border-r">
              <p className="text-6xl tabular-nums sm:text-7xl" style={{ fontFamily: SERIF }}>
                {p.value}
              </p>
              <p className="mt-2 text-xs" style={{ color: C.muted }}>
                {p.label === "Min" ? "Minutos" : p.label === "Seg" ? "Segundos" : p.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* (03) Programa */}
      <section className="mx-auto max-w-6xl px-5 py-24 sm:px-10">
        <Label n="02" t="Programa" />
        <table className="mt-10 w-full text-left">
          <tbody>
            {W.itinerary.map((it, i) => (
              <tr key={it.title} data-reveal style={{ ["--d" as string]: i % 4, borderColor: C.line }} className="border-b">
                <td className="w-28 py-5 align-baseline text-sm sm:w-48" style={{ color: C.muted }}>
                  {it.time}
                </td>
                <td className="py-5 text-2xl sm:text-3xl" style={{ fontFamily: SERIF }}>
                  {it.title}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* (04) Lugar */}
      <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-10">
        <Label n="03" t="Ubicación" />
        <div className="mt-10 grid gap-8 md:grid-cols-[1fr_1.4fr]">
          <div data-reveal>
            <p className="text-xs" style={{ color: C.muted }}>
              {W.venueKind}
            </p>
            <p className="mt-2 text-4xl leading-tight" style={{ fontFamily: SERIF }}>
              La Hacienda <span className="italic">El Encanto de Jeto</span>
            </p>
            <p className="mt-3 text-sm" style={{ color: C.muted }}>
              {W.city} · ceremonia y recepción
            </p>
            <a href={W.mapUrl} target="_blank" rel="noreferrer" className="group mt-8 inline-flex items-center gap-3 rounded-full border px-5 py-3 text-sm transition hover:bg-[#1c1b19] hover:text-white" style={{ borderColor: C.ink }}>
              Abrir en Maps <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
          <div data-reveal="wipe" className="aspect-[16/10] overflow-hidden rounded-2xl border" style={{ borderColor: C.line }}>
            <iframe title="Mapa" src={W.mapEmbed} className="h-full w-full grayscale" loading="lazy" />
          </div>
        </div>
      </section>

      {/* (05) Preguntas: acordeón */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:px-10">
          <Label n="04" t="Lo que debes saber" />
          <div className="mt-10 border-t" style={{ borderColor: C.line }}>
            {details.map((d, i) => (
              <div key={d.q} data-reveal style={{ ["--d" as string]: i, borderColor: C.line }} className="border-b">
                <button onClick={() => setFaq(faq === i ? null : i)} className="flex w-full items-center justify-between gap-4 py-6 text-left">
                  <span className="text-2xl sm:text-3xl" style={{ fontFamily: SERIF }}>
                    {d.q}
                  </span>
                  <Plus className={`size-5 shrink-0 transition-transform duration-500 ${faq === i ? "rotate-45" : ""}`} />
                </button>
                <div className="grid transition-[grid-template-rows] duration-500" style={{ gridTemplateRows: faq === i ? "1fr" : "0fr" }}>
                  <div className="overflow-hidden">
                    <div className="max-w-2xl pb-8 text-sm leading-relaxed" style={{ color: "#4a4740" }}>
                      {d.a}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* (06) Galería */}
      <section className="mx-auto max-w-6xl px-5 py-24 sm:px-10">
        <Label n="05" t="Galería" />
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3">
          {GALLERY.map((src, i) => (
            <button key={src} onClick={() => setLb(i)} data-reveal style={{ ["--d" as string]: i % 3 }} className={`group relative overflow-hidden rounded-xl ${i === 0 ? "row-span-2" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
            </button>
          ))}
        </div>
      </section>

      {/* (07) RSVP */}
      <section className="border-t" style={{ borderColor: C.line }}>
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-24 sm:px-10 md:grid-cols-2">
          <div>
            <Label n="06" t="Confirmación" />
            <p data-reveal className="mt-8 text-5xl leading-tight" style={{ fontFamily: SERIF }}>
              ¿Nos <span className="italic">acompañas?</span>
            </p>
            <p data-reveal className="mt-4 text-sm" style={{ color: C.muted }}>
              Confirma antes del {W.rsvpBy}.
            </p>
          </div>
          <div data-reveal>
            <RsvpDemo
              guest={guest}
              skin={{
                wrap: "",
                label: "text-xs text-[#8a8478]",
                input: "w-full border-0 border-b border-[#e6e1d7] bg-transparent px-0 py-2 outline-none focus:border-[#1c1b19]",
                choice: "rounded-full border border-[#e6e1d7] py-3 text-sm transition hover:border-[#1c1b19]",
                choiceOn: "!border-[#1c1b19] !bg-[#1c1b19] text-white",
                button: "rounded-full bg-[#1c1b19] py-4 text-sm text-white transition hover:bg-[#b39b74]",
                note: "text-sm text-[#8a8478]",
              }}
            />
          </div>
        </div>
      </section>

      <footer className="px-5 pt-10 pb-28 text-center">
        <p data-reveal className="text-[15vw] leading-none italic md:text-[8rem]" style={{ fontFamily: SERIF }}>
          A <span style={{ color: C.accent }}>&amp;</span> I
        </p>
        <p data-reveal className="mt-6 text-sm" style={{ color: C.muted }}>
          {W.closing}
        </p>
      </footer>

      <Lightbox images={GALLERY} index={lb} onClose={() => setLb(null)} onIndex={setLb} />
    </div>
  );
}

function Label({ n, t }: { n: string; t: string }) {
  return (
    <div data-reveal className="flex items-center gap-4 text-sm">
      <span style={{ color: C.muted }}>({n})</span>
      <span className="pp-line h-px w-10" style={{ background: C.ink }} />
      <span>{t}</span>
    </div>
  );
}
