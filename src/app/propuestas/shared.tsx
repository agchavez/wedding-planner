"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, X } from "lucide-react";

/** Datos reales de la boda (propuestas locales, aún no conectadas a la base de datos). */
export const W = {
  partner1: "Angel",
  partner2: "Indira",
  fullNames: "Angel Chavez & Indira Lopez",
  initials: ["A", "I"] as const,
  /** 12 de diciembre de 2026, 3:30 pm hora de Honduras (UTC-6). */
  start: "2026-12-12T15:30:00-06:00",
  dateLong: "Sábado 12 de diciembre de 2026",
  dateShort: "12 · 12 · 2026",
  time: "3:30 pm",
  venue: "La Hacienda El Encanto de Jeto",
  venueKind: "Centro de Eventos",
  city: "Comayagua, Honduras",
  mapUrl: "https://maps.app.goo.gl/optsfjpHS18xXawV7",
  mapEmbed: "https://www.google.com/maps?q=Centro%20de%20Eventos%20La%20Hacienda%20El%20Encanto%20de%20Jeto%20Comayagua&output=embed",
  headline: "¡Nos casamos!",
  message:
    "Nos encantaría que nos acompañes en este día tan especial y que nos bendigas con tu presencia y tus oraciones.",
  quote: "Y sobre todas estas cosas vestíos de amor, que es el vínculo perfecto.",
  quoteRef: "Colosenses 3:14",
  dressCode: "Formal",
  dressNote: "Con cariño les pedimos no usar el color verde: es el color de nuestra boda.",
  adultsOnly:
    "Amamos a sus pequeños, pero esta celebración será solo para adultos. Gracias por comprender y por regalarse una noche para ustedes.",
  gifts: "Tu presencia es nuestro mejor regalo. Si deseas tener un detalle con nosotros, habrá una lluvia de sobres el día de la boda, o puedes hacerlo por transferencia.",
  /** PENDIENTE: datos reales de la cuenta. */
  bank: { bank: "Banco por confirmar", account: "0000 0000 0000", holder: "Angel Chavez" },
  rsvpBy: "28 de noviembre",
  recommendations: ["Llega 20 minutos antes de la ceremonia.", "Habrá estacionamiento en el lugar."],
  closing: "No vemos la hora de celebrar contigo.",
  itinerary: [
    { time: "3:30 pm", title: "Ceremonia nupcial" },
    { time: "7:00 pm", title: "Entrada de los novios y vals con los padres" },
    { time: "8:00 pm", title: "Cena" },
    { time: "9:30 pm", title: "Fotografías con los invitados" },
    { time: "9:30 pm", title: "Brindis y palabras de amigos y familiares" },
    { time: "10:00 pm", title: "Primera ronda de baile" },
    { time: "10:15 pm", title: "Postre" },
    { time: "10:45 pm", title: "Segunda tanda de baile" },
    { time: "11:15 pm", title: "Juegos y lanzamiento de la liga" },
    { time: "11:55 pm", title: "Baile hasta la 1:00 am" },
  ],
};

/** Foto de la sesión: se resuelve en /propuestas/foto/<nombre> (Google Drive o copia local). */
export const photo = (name: string) => `/propuestas/foto/${name}`;

export type Guest = { name: string; seats: number };

export function calendarUrl() {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `Boda de ${W.partner1} & ${W.partner2}`,
    dates: "20261212T213000Z/20261213T060000Z",
    location: `${W.venueKind} ${W.venue}, ${W.city}`,
    details: `Ceremonia a las ${W.time}. Vestimenta formal. Solo adultos.`,
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

export function useCountdown(target = W.start) {
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
  const ready = now !== null;
  return {
    ready,
    parts: [
      { label: "Días", value: ready ? Math.floor(diff / 86400000) : 0 },
      { label: "Horas", value: ready ? Math.floor(diff / 3600000) % 24 : 0 },
      { label: "Min", value: ready ? Math.floor(diff / 60000) % 60 : 0 },
      { label: "Seg", value: ready ? Math.floor(diff / 1000) % 60 : 0 },
    ],
  };
}

/** Añade `.in` a los elementos `[data-reveal]` cuando entran en pantalla. */
export function useReveal(deps: unknown[] = []) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.15, rootMargin: "0px 0px -30px 0px" }
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/** Bloquea el scroll de la página mientras la portada de apertura está visible. */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => {
      el.style.overflow = prev;
    };
  }, [locked]);
}

/** Desplazamiento de la página (para parallax suave). */
export function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setY(window.scrollY));
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      window.removeEventListener("scroll", on);
      cancelAnimationFrame(raf);
    };
  }, []);
  return y;
}

export function CopyButton({ value, className, children }: { value: string; className?: string; children?: ReactNode }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        navigator.clipboard?.writeText(value.replace(/\s/g, ""));
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
      <span>{done ? "¡Copiado!" : (children ?? "Copiar")}</span>
    </button>
  );
}

/** Visor de fotos a pantalla completa (flechas, teclado y deslizar). */
export function Lightbox({ images, index, onClose, onIndex }: { images: string[]; index: number | null; onClose: () => void; onIndex: (i: number) => void }) {
  const touch = useRef<number | null>(null);
  const go = useCallback(
    (d: number) => index !== null && onIndex((index + d + images.length) % images.length),
    [index, images.length, onIndex]
  );
  useEffect(() => {
    if (index === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = "";
    };
  }, [index, go, onClose]);
  if (index === null) return null;
  return (
    <div
      className="pp-fade fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={index} src={images[index]} alt="" className="pp-zoom max-h-[88svh] max-w-[92vw] object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
      <button aria-label="Cerrar" className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={onClose}>
        <X className="size-5" />
      </button>
      <button aria-label="Anterior" className="absolute left-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={(e) => (e.stopPropagation(), go(-1))}>
        <ChevronLeft className="size-6" />
      </button>
      <button aria-label="Siguiente" className="absolute right-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={(e) => (e.stopPropagation(), go(1))}>
        <ChevronRight className="size-6" />
      </button>
      <p className="absolute bottom-5 text-xs tracking-[0.3em] text-white/70">
        {index + 1} / {images.length}
      </p>
    </div>
  );
}

export type RsvpSkin = {
  wrap: string;
  label: string;
  input: string;
  choice: string;
  choiceOn: string;
  button: string;
  note: string;
};

/** Confirmación de asistencia (demostración: no guarda nada). */
export function RsvpDemo({ guest, skin }: { guest: Guest; skin: RsvpSkin }) {
  const [attending, setAttending] = useState<boolean | null>(null);
  const [seats, setSeats] = useState(guest.seats);
  const [sent, setSent] = useState(false);

  if (sent)
    return (
      <div className={`${skin.wrap} pp-pop text-center`}>
        <p className="text-3xl">{attending ? "🥂" : "💌"}</p>
        <p className={`${skin.label} mt-3`}>{attending ? "¡Gracias por confirmar!" : "Gracias por avisarnos"}</p>
        <p className={`${skin.note} mt-2`}>
          {attending
            ? `Te esperamos el 12 de diciembre${seats > 1 ? ` · ${seats} lugares` : ""}.`
            : "Te vamos a extrañar. ¡Gracias por tu cariño!"}
        </p>
        <button type="button" className={`${skin.note} mt-4 underline underline-offset-4`} onClick={() => setSent(false)}>
          Cambiar respuesta
        </button>
      </div>
    );

  return (
    <form
      className={skin.wrap}
      onSubmit={(e) => {
        e.preventDefault();
        if (attending !== null) setSent(true);
      }}
    >
      <p className={skin.note}>
        Hemos reservado <strong>{guest.seats} {guest.seats === 1 ? "lugar" : "lugares"}</strong> para {guest.name}.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {[
          [true, "Sí, asistiré"],
          [false, "No podré ir"],
        ].map(([v, label]) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => setAttending(v as boolean)}
            className={`${skin.choice} ${attending === v ? skin.choiceOn : ""}`}
          >
            {label as string}
          </button>
        ))}
      </div>
      {attending && guest.seats > 1 && (
        <label className="pp-fade mt-5 block">
          <span className={skin.label}>¿Cuántos asistirán?</span>
          <select className={`${skin.input} mt-2`} value={seats} onChange={(e) => setSeats(Number(e.target.value))}>
            {Array.from({ length: guest.seats }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "persona" : "personas"}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="mt-5 block">
        <span className={skin.label}>Un mensaje para los novios (opcional)</span>
        <textarea rows={3} className={`${skin.input} mt-2 resize-none`} placeholder="Escribe tus buenos deseos…" />
      </label>
      <button type="submit" disabled={attending === null} className={`${skin.button} mt-6 w-full disabled:opacity-40`}>
        Enviar confirmación
      </button>
      <p className={`${skin.note} mt-3 text-center`}>Por favor confirma antes del {W.rsvpBy}.</p>
    </form>
  );
}

/** Íconos de vestimenta formal: traje, vestido largo y "sin verde". */
export function DressIcons({ color, muted, className = "" }: { color: string; muted: string; className?: string }) {
  const stroke = { fill: "none", stroke: color, strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  const items = [
    {
      label: "Traje",
      svg: (
        <>
          <path {...stroke} d="M14 58V25q0-6 6-8l6-3 6 16 6-16 6 3q6 2 6 8v33z" />
          <path {...stroke} d="M26 14l2 20 4-4M38 14l-2 20-4-4M32 30v28" />
          <path fill={color} d="M28 17.5l4 2.3-4 2.3zM36 17.5l-4 2.3 4 2.3z" />
          <circle fill={color} cx="32" cy="40" r="1.1" />
          <circle fill={color} cx="32" cy="47" r="1.1" />
        </>
      ),
    },
    {
      label: "Vestido largo",
      svg: (
        <>
          <path {...stroke} d="M26 8l1.5 12M38 8l-1.5 12" />
          <path {...stroke} d="M27.5 20q4.5 3 9 0L36 30q-4 2-8 0z" />
          <path {...stroke} d="M28 30q-4 14-12 28 16 3 32 0-8-14-12-28" />
          <path {...stroke} strokeWidth={1} d="M31 34l-3 23M34 34l4 23" />
        </>
      ),
    },
    {
      label: "Sin verde",
      svg: (
        <>
          <circle cx="32" cy="34" r="13" fill="#5f7a3a" />
          <circle {...stroke} cx="32" cy="34" r="19" />
          <path {...stroke} strokeWidth={2.2} d="M18.5 20.5l27 27" />
        </>
      ),
    },
  ];
  return (
    <div className={`flex gap-6 sm:gap-8 ${className}`}>
      {items.map((it) => (
        <div key={it.label} className="flex flex-col items-center gap-2 text-center">
          <svg viewBox="0 0 64 64" className="size-14 sm:size-16" aria-hidden>
            {it.svg}
          </svg>
          <span className="text-[10px] tracking-[0.2em] uppercase" style={{ color: muted }}>
            {it.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Carga una hoja de Google Fonts solo en esta página de propuestas. */
export function Fonts({ families }: { families: string }) {
  return <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${families}&display=swap`} precedence="default" />;
}
