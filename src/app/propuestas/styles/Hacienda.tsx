"use client";

import { useState } from "react";
import { Baby, CalendarPlus, Gift, Heart, MapPin, Shirt } from "lucide-react";
import { CopyButton, DressIcons, Fonts, Lightbox, RsvpDemo, W, calendarUrl, photo, useCountdown, useReveal, useScrollLock, useScrollY, type Guest } from "../shared";

const SERIF = "'Fraunces', Georgia, serif";
const SANS = "'DM Sans', system-ui, sans-serif";
const C = { bg: "#ece8da", paper: "#f8f6ee", ink: "#2e3123", muted: "#78765f", terra: "#5f6745", caramel: "#b8975a", deep: "#454a31" };
const GALLERY = ["c-caminata", "c-anillo", "c-beso3", "c-frente", "c-beso2", "c-sombrilla"].map(photo);

export function Hacienda({ guest }: { guest: Guest }) {
  // closed → opening (sello, solapa y tarjeta) → reveal (se desvanece el sobre y entra la portada) → open
  const [stage, setStage] = useState<"closed" | "opening" | "reveal" | "open">("closed");
  const [lb, setLb] = useState<number | null>(null);
  const ref = useReveal([stage]);
  const y = useScrollY();
  const { parts } = useCountdown();
  const revealed = stage === "reveal" || stage === "open";
  useScrollLock(stage !== "open");

  const openEnvelope = () => {
    if (stage !== "closed") return;
    setStage("opening");
    setTimeout(() => setStage("reveal"), 2300);
    setTimeout(() => setStage("open"), 3200);
  };

  return (
    <div ref={ref} style={{ background: C.bg, color: C.ink, fontFamily: SANS }} className="min-h-svh overflow-x-clip">
      <Fonts families="family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=DM+Sans:wght@400;500;600" />

      {/* Sobre */}
      {stage !== "open" && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-12 transition-opacity duration-[900ms] ease-out ${stage === "reveal" ? "opacity-0" : ""}`}
          style={{ background: `radial-gradient(circle at 50% 40%, ${C.paper}, ${C.bg})` }}
        >
          <div className={`transition duration-500 ${stage !== "closed" ? "-translate-y-2 opacity-0" : ""}`}>
            <p style={{ fontFamily: SERIF }} className="pp-rise text-center text-lg italic">
              Una invitación para <br />
              <span className="text-2xl not-italic">{guest.name}</span>
            </p>
          </div>
          <div className={`transition duration-[900ms] ease-out ${stage === "reveal" ? "translate-y-6 scale-95" : ""}`}>
            <div className="pp-rise" style={{ ["--d" as string]: 2 }}>
            <button onClick={openEnvelope} aria-label="Abrir sobre" className={`pp-env relative block h-[220px] w-[min(320px,84vw)] ${stage !== "closed" ? "open" : ""}`}>
              {/* Interior del sobre */}
              <div className="absolute inset-0 rounded-md" style={{ background: C.deep }} />
              <div className="pp-env-card absolute inset-x-4 top-3 bottom-3 flex flex-col items-center justify-center rounded-sm" style={{ background: C.paper }}>
                <p style={{ fontFamily: SERIF }} className="text-3xl italic">
                  Angel &amp; Indira
                </p>
                <span className="my-2 h-px w-10" style={{ background: C.caramel }} />
                <p className="text-[10px] tracking-[0.35em] uppercase" style={{ color: C.muted }}>
                  12 · 12 · 2026
                </p>
              </div>
              {/* Bolsillo frontal */}
              <div
                className="pp-env-pocket absolute inset-0 rounded-md shadow-[0_18px_40px_-18px_rgb(30_34_20/0.6)]"
                style={{ background: C.terra, clipPath: "polygon(0 0, 50% 56%, 100% 0, 100% 100%, 0 100%)" }}
              />
              <div className="pp-env-pocket absolute inset-0 rounded-md" style={{ background: "#000", opacity: 0.12, clipPath: "polygon(0 100%, 50% 52%, 100% 100%)" }} />
              {/* Solapa */}
              <div className="pp-env-flap absolute inset-x-0 top-0 h-[58%]" style={{ background: "#6c7451", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
              {/* Sello de cera */}
              <div
                className="pp-env-seal pp-pulse absolute top-[50%] left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-lg italic text-[#f3efe1] shadow-lg ring-4 ring-[#3a3f29]/40"
                style={{ background: `radial-gradient(circle at 35% 30%, ${C.caramel}, #8a6e3c)`, fontFamily: SERIF }}
              >
                A·I
              </div>
            </button>
            </div>
          </div>
          <p
            className={`text-xs tracking-[0.3em] uppercase transition-opacity duration-300 ${stage !== "closed" ? "opacity-0" : ""}`}
            style={{ color: C.muted }}
          >
            <span className="pp-bob inline-block">Toca el sello para abrir</span>
          </p>
        </div>
      )}

      {/* Portada con arco */}
      <header
        key={revealed ? "on" : "off"}
        className={`relative mx-auto flex min-h-svh max-w-6xl flex-col items-center justify-center gap-10 px-5 py-16 md:flex-row md:gap-16 ${revealed ? "" : "invisible"}`}
      >
        <div className="pp-rise relative">
          <div className="relative h-[62svh] max-h-[620px] w-[min(78vw,380px)] overflow-hidden rounded-t-full border-[10px] shadow-2xl" style={{ borderColor: C.paper }}>
            <div className="h-full w-full" style={{ transform: `translateY(${y * 0.08}px) scale(1.08)` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo("c-mirada")} alt="Angel e Indira" className={`h-full w-full object-cover ${revealed ? "pp-ken" : "pp-ken-wait"}`} />
            </div>
          </div>
          {/* Sello giratorio */}
          <div className="absolute -right-8 -bottom-8 size-32 rounded-full shadow-xl sm:-right-12" style={{ background: C.terra }}>
            <svg viewBox="0 0 100 100" className="pp-spin absolute inset-0 text-[#f3efe1]">
              <defs>
                <path id="hc-circle" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
              </defs>
              <text fontSize="9.5" letterSpacing="3" fill="currentColor" style={{ fontFamily: SANS }}>
                <textPath href="#hc-circle">ANGEL & INDIRA · 12 DIC 2026 ·</textPath>
              </text>
            </svg>
            <Heart className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 fill-[#f3efe1] text-[#f3efe1]" />
          </div>
        </div>
        <div className="max-w-md text-center md:text-left">
          <p className="pp-rise text-xs tracking-[0.4em] uppercase" style={{ color: C.terra, ["--d" as string]: 1 }}>
            {W.headline}
          </p>
          <h1 style={{ fontFamily: SERIF }} className="pp-rise mt-4 text-7xl leading-[0.9] font-light sm:text-8xl" >
            <span style={{ ["--d" as string]: 2 }}>Angel</span>
            <span className="block italic" style={{ color: C.terra }}>
              &amp; Indira
            </span>
          </h1>
          <p className="pp-rise mt-6 leading-relaxed" style={{ color: C.muted, ["--d" as string]: 3 }}>
            {W.message}
          </p>
          <div className="pp-rise mt-8 inline-flex items-center gap-4 rounded-full px-6 py-3 text-sm" style={{ background: C.paper, ["--d" as string]: 4 }}>
            <span style={{ fontFamily: SERIF }} className="text-xl italic">
              12.12.26
            </span>
            <span className="h-4 w-px" style={{ background: C.caramel }} />
            <span>{W.time}</span>
            <span className="h-4 w-px" style={{ background: C.caramel }} />
            <span>Comayagua</span>
          </div>
        </div>
      </header>

      {/* Calendario + cuenta regresiva */}
      <section className="px-5 py-20" style={{ background: C.paper }}>
        <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
          <div data-reveal className="mx-auto w-full max-w-sm">
            <p style={{ fontFamily: SERIF }} className="text-center text-4xl italic">
              Diciembre
            </p>
            <p className="text-center text-xs tracking-[0.3em]" style={{ color: C.muted }}>
              2026
            </p>
            <div className="mt-6 grid grid-cols-7 gap-y-3 text-center text-sm">
              {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                <span key={i} className="text-[11px] font-semibold" style={{ color: C.caramel }}>
                  {d}
                </span>
              ))}
              {/* Diciembre 2026 empieza en martes */}
              <span />
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <span key={d} className="relative flex h-9 items-center justify-center">
                  {d === 12 ? (
                    <span className="pp-pulse flex size-10 items-center justify-center rounded-full font-semibold text-[#f3efe1]" style={{ background: C.terra }}>
                      12
                    </span>
                  ) : (
                    <span style={{ color: C.muted }}>{d}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
          <div className="text-center md:text-left">
            <p data-reveal style={{ fontFamily: SERIF }} className="text-3xl font-light">
              {W.dateLong}
            </p>
            <p data-reveal className="mt-2" style={{ color: C.muted }}>
              Ceremonia a las {W.time}
            </p>
            <div className="mt-8 grid grid-cols-4 gap-3">
              {parts.map((p, i) => (
                <div key={p.label} data-reveal="scale" style={{ ["--d" as string]: i, background: C.bg }} className="rounded-2xl py-4 text-center">
                  <p style={{ fontFamily: SERIF }} className="text-3xl tabular-nums sm:text-4xl">
                    {p.value}
                  </p>
                  <p className="mt-1 text-[10px] tracking-[0.2em] uppercase" style={{ color: C.muted }}>
                    {p.label}
                  </p>
                </div>
              ))}
            </div>
            <a
              data-reveal
              href={calendarUrl()}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-[#f3efe1] transition hover:brightness-110"
              style={{ background: C.terra }}
            >
              <CalendarPlus className="size-4" /> Guardar la fecha
            </a>
          </div>
        </div>
      </section>

      {/* Programa */}
      <section className="mx-auto max-w-3xl px-5 py-24">
        <Title kicker="El gran día" title="Programa" />
        <ol className="relative mt-14">
          <div className="absolute top-2 bottom-2 left-[5.5rem] w-px sm:left-1/2" style={{ background: C.caramel }} />
          {W.itinerary.map((it, i) => (
            <li
              key={it.title}
              data-reveal={i % 2 ? "right" : "left"}
              className={`relative mb-8 grid grid-cols-[5rem_1fr] items-center gap-8 sm:grid-cols-2 sm:gap-14 ${i % 2 ? "" : "sm:[&>*:first-child]:order-2 sm:[&>*:first-child]:text-left sm:[&>*:last-child]:text-right"}`}
            >
              <p className="text-right text-sm font-semibold" style={{ color: C.terra }}>
                {it.time}
              </p>
              <p style={{ fontFamily: SERIF }} className="text-xl sm:text-2xl">
                {it.title}
              </p>
              <span className="absolute top-1/2 left-[5.5rem] size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 sm:left-1/2" style={{ background: C.terra, ["--tw-ring-color" as string]: C.bg }} />
            </li>
          ))}
        </ol>
      </section>

      {/* Lugar */}
      <section className="px-5 pb-24">
        <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] shadow-xl md:grid-cols-[1fr_1.2fr]" style={{ background: C.paper }}>
          <div data-reveal="clip" className="relative min-h-[360px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo("c-jardin")} alt="" className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <div className="p-8 sm:p-12">
            <Title kicker={W.venueKind} title="La Hacienda" left />
            <p data-reveal style={{ fontFamily: SERIF }} className="mt-2 text-2xl italic" >
              El Encanto de Jeto
            </p>
            <p data-reveal className="mt-3 text-sm" style={{ color: C.muted }}>
              {W.city}. La ceremonia y la recepción serán en el mismo lugar.
            </p>
            <div data-reveal className="mt-6 aspect-video overflow-hidden rounded-2xl">
              <iframe title="Mapa" src={W.mapEmbed} className="h-full w-full" loading="lazy" />
            </div>
            <a
              data-reveal
              href={W.mapUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-[#f3efe1]"
              style={{ background: C.deep }}
            >
              <MapPin className="size-4" /> Abrir en Google Maps
            </a>
          </div>
        </div>
      </section>

      {/* Detalles */}
      <section className="px-5 py-20" style={{ background: C.deep, color: "#f3efe1" }}>
        <div className="mx-auto max-w-5xl">
          <Title kicker="Para que todo salga perfecto" title="Detalles" light />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <Card icon={<Shirt className="size-6" />} title="Vestimenta formal" d={0}>
              <p>{W.dressNote}</p>
              <DressIcons color="#f3efe1" muted="#f3efe1b3" className="mt-5" />
            </Card>
            <Card icon={<Baby className="size-6" />} title="Solo adultos" d={1}>
              <p>{W.adultsOnly}</p>
            </Card>
            <Card icon={<Gift className="size-6" />} title="Lluvia de sobres" d={2}>
              <p>{W.gifts}</p>
              <div className="mt-4 rounded-xl bg-black/20 p-3 text-xs leading-relaxed">
                <p>{W.bank.bank}</p>
                <p className="font-semibold tracking-wider">{W.bank.account}</p>
                <p className="opacity-70">{W.bank.holder}</p>
              </div>
              <CopyButton value={W.bank.account} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#f3efe1] px-4 py-2 text-xs font-semibold text-[#454a31]">
                Copiar cuenta
              </CopyButton>
            </Card>
          </div>
        </div>
      </section>

      {/* Galería en mosaico */}
      <section className="mx-auto max-w-5xl px-5 py-24">
        <Title kicker="Nuestra historia" title="Momentos" />
        <div className="mt-12 columns-2 gap-4 md:columns-3">
          {GALLERY.map((src, i) => (
            <button key={src} onClick={() => setLb(i)} data-reveal="scale" style={{ ["--d" as string]: i % 3 }} className="group mb-4 block w-full overflow-hidden rounded-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" className="w-full transition duration-700 group-hover:scale-105" />
            </button>
          ))}
        </div>
      </section>

      {/* RSVP */}
      <section className="px-5 pb-24">
        <div className="mx-auto max-w-lg rounded-[2rem] p-8 shadow-xl sm:p-10" style={{ background: C.paper }}>
          <Title kicker={`Antes del ${W.rsvpBy}`} title="¿Nos acompañas?" />
          <div className="mt-8" data-reveal>
            <RsvpDemo
              guest={guest}
              skin={{
                wrap: "",
                label: "text-sm font-medium text-[#454a31]",
                input: "w-full rounded-2xl border border-[#d9d4c0] bg-white/60 px-4 py-3 outline-none focus:border-[#5f6745]",
                choice: "rounded-2xl border border-[#d9d4c0] py-4 text-sm font-medium transition hover:border-[#5f6745]",
                choiceOn: "!border-[#5f6745] !bg-[#5f6745] text-[#f3efe1]",
                button: "rounded-full bg-[#454a31] py-4 font-medium text-[#f3efe1] transition hover:bg-[#5f6745]",
                note: "text-sm text-[#78765f]",
              }}
            />
          </div>
        </div>
      </section>

      {/* Cierre */}
      <footer className="px-5 pb-28 text-center">
        <div data-reveal className="mx-auto size-40 overflow-hidden rounded-full border-8 shadow-lg" style={{ borderColor: C.paper }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo("c-anillo2")} alt="" className="h-full w-full object-cover" />
        </div>
        <p data-reveal style={{ fontFamily: SERIF }} className="mt-8 text-4xl font-light italic sm:text-5xl">
          {W.closing}
        </p>
        <p data-reveal className="mt-4 text-sm" style={{ color: C.muted }}>
          “{W.quote}”
          <span className="mt-1 block text-[10px] tracking-[0.35em] uppercase" style={{ color: C.caramel }}>{W.quoteRef}</span>
        </p>
        <p data-reveal className="mt-8 text-xs tracking-[0.4em] uppercase" style={{ color: C.terra }}>
          Angel &amp; Indira
        </p>
      </footer>

      <Lightbox images={GALLERY} index={lb} onClose={() => setLb(null)} onIndex={setLb} />
    </div>
  );
}

function Title({ kicker, title, left, light }: { kicker: string; title: string; left?: boolean; light?: boolean }) {
  return (
    <div className={left ? "" : "text-center"}>
      <p data-reveal className="text-xs tracking-[0.35em] uppercase" style={{ color: light ? C.caramel : C.terra }}>
        {kicker}
      </p>
      <h2 data-reveal style={{ fontFamily: SERIF, ["--d" as string]: 1 }} className="mt-2 text-5xl font-light sm:text-6xl">
        {title}
      </h2>
    </div>
  );
}

function Card({ icon, title, children, d }: { icon: React.ReactNode; title: string; children: React.ReactNode; d: number }) {
  return (
    <div data-reveal style={{ ["--d" as string]: d }} className="rounded-[1.75rem] bg-white/5 p-7 text-sm leading-relaxed ring-1 ring-white/10 transition hover:-translate-y-1 hover:bg-white/10">
      <div className="flex size-12 items-center justify-center rounded-full text-[#2e3123]" style={{ background: C.caramel }}>
        {icon}
      </div>
      <p style={{ fontFamily: SERIF }} className="mt-5 text-2xl">
        {title}
      </p>
      <div className="mt-3 opacity-85">{children}</div>
    </div>
  );
}
