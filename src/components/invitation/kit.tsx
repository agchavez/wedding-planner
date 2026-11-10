"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, Pause, Play, X } from "lucide-react";
import { EVENT_TIME_ZONE } from "@/lib/eventTime";

/** Piezas comunes de la invitación Editorial (sin datos fijos: todo llega por props). */

export const SERIF = "'Bodoni Moda', 'Didot', Georgia, serif";
export const SANS = "'Inter', system-ui, sans-serif";
export const SCRIPT = "var(--font-inv-script), 'Great Vibes', cursive";
export const C = { bg: "#f2eee3", ink: "#343a26", muted: "#757359", line: "#d9d4c1", accent: "#a8996a", deep: "#343a26", cream: "#f2eee3" };

/** Hoja de Google Fonts en tiempo de ejecución (no en el build). */
export function EditorialFonts() {
  return (
    // eslint-disable-next-line @next/next/no-page-custom-font -- solo la invitación usa estas fuentes (App Router, no hay _document)
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=Inter:wght@300;400;500;600&display=swap"
      precedence="default"
    />
  );
}

export function useCountdown(target: string | null) {
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
  const ready = now !== null && Boolean(target);
  const diff = ready ? Math.max(0, new Date(target!).getTime() - now!) : 0;
  return {
    ready,
    done: ready && diff === 0,
    parts: [
      { label: "Días", value: Math.floor(diff / 86400000) },
      { label: "Horas", value: Math.floor(diff / 3600000) % 24 },
      { label: "Min", value: Math.floor(diff / 60000) % 60 },
      { label: "Seg", value: Math.floor(diff / 1000) % 60 },
    ],
  };
}

/** Añade `.in` a los `[data-reveal]` al entrar en pantalla; `key` cambia cuando cambian los bloques. */
export function useReveal(enabled: boolean, key: string) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !enabled) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]:not(.in)"));
    if (typeof IntersectionObserver === "undefined") {
      items.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [enabled, key]);
  return ref;
}

/** Día del evento en la zona de la boda, con nombres en español. */
export function eventDay(iso: string | null, timed: boolean) {
  if (!iso) return null;
  const tz = timed ? EVENT_TIME_ZONE : "UTC";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(iso));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const year = get("year");
  const month = get("month") - 1;
  const day = get("day");
  const utc = new Date(Date.UTC(year, month, day));
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-HN", { ...o, timeZone: "UTC" }).format(utc);
  const weekday = fmt({ weekday: "long" });
  const monthName = fmt({ month: "long" });
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    year,
    month,
    day,
    weekday,
    monthName,
    /** "Sábado 12 de diciembre de 2026" */
    long: `${weekday[0].toUpperCase()}${weekday.slice(1)} ${day} de ${monthName} de ${year}`,
    /** "12.12.2026" */
    dots: `${pad(day)}.${pad(month + 1)}.${year}`,
    /** "12.12.26" */
    short: `${pad(day)}.${pad(month + 1)}.${String(year).slice(2)}`,
  };
}

/** "3:30 p. m." → "3:30 pm" */
export function prettyTime(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es-HN", { timeZone: EVENT_TIME_ZONE, hour: "numeric", minute: "2-digit" })
    .format(new Date(iso))
    .replace(/\s*([ap])\.?\s?m\.?/i, (_, a: string) => ` ${a.toLowerCase()}m`);
}

export function CopyButton({ value, className, children }: { value: string; className?: string; children?: ReactNode }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value.replace(/\s/g, ""));
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          // Sin portapapeles: el número queda visible para copiarlo a mano.
        }
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
  const go = useCallback((d: number) => index !== null && onIndex((index + d + images.length) % images.length), [index, images.length, onIndex]);
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
  if (index === null || !images[index]) return null;
  return (
    <div
      className="pp-fade fixed inset-0 z-[70] flex items-center justify-center bg-[#1f2316]/95 backdrop-blur-sm"
      onClick={onClose}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- fotos elegidas por la pareja */}
      <img key={index} src={images[index]} alt="" className="pp-zoom max-h-[88svh] max-w-[92vw] object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
      <button type="button" aria-label="Cerrar" className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={onClose}>
        <X className="size-5" />
      </button>
      {images.length > 1 && (
        <>
          <button type="button" aria-label="Anterior" className="absolute left-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={(e) => (e.stopPropagation(), go(-1))}>
            <ChevronLeft className="size-6" />
          </button>
          <button type="button" aria-label="Siguiente" className="absolute right-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" onClick={(e) => (e.stopPropagation(), go(1))}>
            <ChevronRight className="size-6" />
          </button>
        </>
      )}
      <p className="absolute bottom-5 text-xs tracking-[0.3em] text-white/70">
        {index + 1} / {images.length}
      </p>
    </div>
  );
}

/** Íconos de vestimenta: traje, vestido largo y, si la nota pide evitar el verde, "sin verde". */
export function DressIcons({ color, muted, noGreen, className = "" }: { color: string; muted: string; noGreen: boolean; className?: string }) {
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
    ...(noGreen
      ? [
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
        ]
      : []),
  ];
  return (
    <div className={`flex gap-6 ${className}`}>
      {items.map((it) => (
        <div key={it.label} className="flex flex-col items-center gap-2 text-center">
          <svg viewBox="0 0 64 64" className="size-14" aria-hidden>
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

/** Botón flotante para la canción de la boda. */
export function SongButton({ url, title }: { url: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
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
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausar canción" : `Reproducir canción${title ? `: ${title}` : ""}`}
        className="fixed right-4 bottom-4 z-40 flex size-12 items-center justify-center rounded-full border border-[#a8996a]/60 bg-[#f2eee3]/90 text-[#343a26] shadow-lg backdrop-blur transition active:scale-95"
      >
        {playing ? <Pause className="size-4" fill="currentColor" /> : <Play className="ml-0.5 size-4" fill="currentColor" />}
      </button>
      <audio ref={audioRef} src={url} preload="none" loop onEnded={() => setPlaying(false)} />
    </>
  );
}
