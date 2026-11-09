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
  quote: "Un matrimonio feliz es enamorarse muchas veces, siempre de la misma persona.",
  dressCode: "Formal",
  dressNote: "Con cariño les pedimos evitar el blanco (es para la novia) y el verde (es el color de nuestra boda).",
  /** Sugerencias de vestimenta: sin verde y sin blanco. */
  dressPalette: [
    { name: "Champaña", hex: "#cdb48e" },
    { name: "Terracota", hex: "#a75a3f" },
    { name: "Vino", hex: "#5e1f2b" },
    { name: "Azul noche", hex: "#1e2740" },
    { name: "Negro", hex: "#141414" },
  ],
  adultsOnly:
    "Amamos a sus pequeños, pero esta celebración será solo para adultos. Gracias por comprender y por regalarse una noche para ustedes.",
  gifts: "Tu presencia es nuestro mejor regalo. Si deseas tener un detalle con nosotros, habrá una lluvia de sobres el día de la boda, o puedes hacerlo por transferencia.",
  /** PENDIENTE: datos reales de la cuenta. */
  bank: { bank: "Banco por confirmar", account: "0000 0000 0000", holder: "Angel Chavez" },
  rsvpBy: "28 de noviembre",
  recommendations: ["Llega 20 minutos antes de la ceremonia.", "Habrá estacionamiento en el lugar."],
  closing: "No vemos la hora de celebrar contigo.",
  itinerary: [
    { time: "3:30 pm", title: "Ceremonia" },
    { time: "5:30 pm", title: "Cóctel de bienvenida" },
    { time: "6:30 pm", title: "Sesión de fotos" },
    { time: "7:00 pm", title: "Entrada de los novios y primer baile" },
    { time: "8:00 pm", title: "Cena" },
    { time: "9:30 pm", title: "Corte del pastel y brindis" },
    { time: "10:00 pm", title: "¡Fiesta!" },
  ],
};

export const photo = (name: string) => `/propuestas/${name}.webp`;

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

/** Carga una hoja de Google Fonts solo en esta página de propuestas. */
export function Fonts({ families }: { families: string }) {
  return <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${families}&display=swap`} precedence="default" />;
}
