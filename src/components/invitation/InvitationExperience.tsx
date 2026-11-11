"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  InvitationView,
  effectiveData,
  type InvitationViewProps,
} from "@/components/invitation/InvitationView";
import { C, SCRIPT, SERIF, eventDay } from "@/components/invitation/kit";
import {
  DEFAULT_PROPS,
  designFromData,
  driveImageAt,
  findBlock,
  framingStyle,
  openingColors,
} from "@/lib/invitationBlocks";

/**
 * Invitación pública: primero la pantalla de apertura y, al abrirla, la portada empieza su
 * animación a la vista. Se abre tocando el botón o deslizando hacia arriba (rueda, dedo o teclado).
 *
 * El estilo, los colores y el botón salen del bloque de portada (editable):
 * - "arch": lino, foto de la pareja en un arco y sello; el contenido se desvanece y el telón se abre.
 * - "curtain", "side" y "names": telón tipográfico (iniciales o nombres) que se parte en dos hojas.
 */
export function InvitationExperience(props: InvitationViewProps) {
  const { data, guest } = props;
  const design = useMemo(
    () => props.design ?? designFromData(data),
    [props.design, data],
  );
  const [stage, setStage] = useState<"closed" | "opening" | "done">("closed");
  const [started, setStarted] = useState(false);

  const cover = findBlock(design, "cover", true) ?? findBlock(design, "cover");
  const look = cover?.props ?? DEFAULT_PROPS.cover;
  const style = look.openingStyle;
  const isArch = style === "arch";

  useEffect(() => {
    if (stage === "done") return;
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    return () => {
      el.style.overflow = prev;
    };
  }, [stage]);

  const open = useCallback(() => {
    if (stage !== "closed") return;
    window.scrollTo({ top: 0 });
    setStage("opening");
    // El arco desvanece su contenido antes de abrir el telón; los telones tipográficos abren de una vez.
    setTimeout(() => setStarted(true), isArch ? 900 : 500);
    setTimeout(() => setStage("done"), isArch ? 1900 : 1450);
  }, [stage, isArch]);

  // Deslizar hacia arriba (o bajar con la rueda o el teclado) también abre la invitación.
  useEffect(() => {
    if (stage !== "closed") return;
    let startY: number | null = null;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 8) open();
    };
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (startY !== null && y !== undefined && startY - y > 30) open();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") open();
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
    };
  }, [stage, open]);

  const colors = openingColors(look);
  const custom = Boolean(look.openingBg || look.openingText || look.openingAccent);
  const muted = look.openingText ? `color-mix(in srgb, ${colors.text} 70%, transparent)` : isArch ? C.muted : `color-mix(in srgb, ${colors.text} 70%, transparent)`;
  const buttonText = look.openingButtonText.trim() || DEFAULT_PROPS.cover.openingButtonText;

  const photo = look.openingPhotoUrl || look.photoUrl || "";
  const photoFraming = look.openingPhotoUrl
    ? look.framing.openingPhotoUrl
    : look.framing.photoUrl;
  const fx = effectiveData(data, design);
  const start = fx.ceremonyTime ?? fx.receptionTime ?? data.weddingDate;
  const day = eventDay(start, Boolean(fx.ceremonyTime || fx.receptionTime));
  const p1 = data.partner1.trim();
  const p2 = data.partner2.trim();
  // En la apertura van solo los nombres de pila: con apellidos se parte en dos líneas en el celular.
  const first1 = p1.split(/\s+/)[0] ?? "";
  const first2 = p2.split(/\s+/)[0] ?? "";
  const i1 = (p1[0] ?? "").toUpperCase();
  const i2 = (p2[0] ?? "").toUpperCase();
  const mono = [i1, i2].filter(Boolean).join("·") || "♥";
  const kicker = [look.openingKicker, day?.dots].filter(Boolean).join(" · ");
  const headline = (look.headline || "Nos casamos").replace(/[¡!]/g, "");
  const dateLine = day ? `${day.day} de ${day.monthName} de ${day.year}` : "";
  const guestLine = `Para ${guest?.fullName ?? "ti"}`;

  const rootStyle = {
    color: colors.text,
    ["--o-bg" as string]: colors.bg,
    ["--o-fg" as string]: colors.text,
    ["--o-accent" as string]: colors.accent,
  } as CSSProperties;
  const rootClass = `ed-opening fixed inset-0 z-50 ${stage !== "closed" ? "open pointer-events-none" : ""}`;

  const button = (
    <button
      type="button"
      onClick={open}
      className={`ed-obtn ed-obtn-${look.openingButtonStyle} text-xs tracking-[0.35em] uppercase`}
    >
      {buttonText}
    </button>
  );
  const kickerLine = kicker && (
    <p className="text-[clamp(9px,2.8vw,11px)] tracking-[0.5em] uppercase opacity-70">
      {kicker}
    </p>
  );
  const amp = <span style={{ color: colors.accent }}>&amp;</span>;

  let opening = null;
  if (stage === "done") {
    opening = null;
  } else if (style === "curtain" || style === "names") {
    // Nombres: el tamaño se ajusta al más largo para que quepa en una línea del celular.
    const longest = Math.max(first1.length, first2.length + 2, 4);
    const nameSize = `min(${Math.min(20, 150 / longest).toFixed(1)}vw, 9rem)`;
    opening = (
      <div className={rootClass} style={rootStyle}>
        <div className="ed-leaf ed-leaf-top absolute inset-x-0 top-0 flex h-1/2 items-end justify-center px-5 pb-6 text-center">
          {style === "curtain" || !first1 || !first2 ? (
            <p style={{ fontFamily: SERIF }} className="text-7xl italic sm:text-8xl">
              {i1 || "♥"} {i2 && <>{amp} {i2}</>}
            </p>
          ) : (
            <p style={{ fontFamily: SERIF, fontSize: nameSize }} className="-mb-3 whitespace-nowrap italic leading-[0.9]">
              {first1}
            </p>
          )}
        </div>
        <div className="ed-leaf ed-leaf-bottom absolute inset-x-0 bottom-0 flex h-1/2 flex-col items-center justify-start gap-6 px-5 pt-4 text-center">
          {style === "names" && first1 && first2 && (
            <p style={{ fontFamily: SERIF, fontSize: nameSize }} className="-mt-1 mb-2 whitespace-nowrap leading-[0.9]">
              {amp} {first2}
            </p>
          )}
          {kickerLine}
          <p className="text-sm opacity-80">{guestLine}</p>
          <div className="mt-2">{button}</div>
        </div>
      </div>
    );
  } else if (style === "side") {
    opening = (
      <div className={rootClass} style={rootStyle}>
        <div className="ed-leaf ed-leaf-left absolute inset-y-0 left-0 flex w-1/2 items-center justify-end overflow-hidden">
          <span style={{ fontFamily: SERIF }} className="pr-[5vw] text-[clamp(8rem,44vw,17rem)] italic leading-none">
            {i1}
          </span>
        </div>
        <div className="ed-leaf ed-leaf-right absolute inset-y-0 right-0 flex w-1/2 items-center justify-start overflow-hidden">
          <span style={{ fontFamily: SERIF }} className="pl-[5vw] text-[clamp(8rem,44vw,17rem)] italic leading-none">
            {i2}
          </span>
        </div>
        <div className="ed-open-content absolute inset-0 flex flex-col items-center justify-between px-5 py-[9svh] text-center">
          {kickerLine || <span />}
          {i1 && i2 && (
            <span
              style={{ fontFamily: SERIF, color: colors.accent, background: colors.bg }}
              className="px-2 text-[clamp(2.2rem,11vw,4rem)] italic leading-none"
              aria-hidden
            >
              &amp;
            </span>
          )}
          <div className="flex flex-col items-center gap-6">
            <p className="text-sm opacity-80">{guestLine}</p>
            {button}
          </div>
        </div>
      </div>
    );
  } else {
    const half = (side: "top" | "bottom") => (
      <div
        className={`ed-half ed-half-${side} ed-linen absolute inset-x-0 h-1/2 overflow-hidden ${side === "top" ? "top-0" : "bottom-0"}`}
        style={custom ? { backgroundColor: colors.bg } : undefined}
      >
        {photo && (
          <div
            className={`absolute inset-x-0 h-[100svh] bg-cover bg-center opacity-[0.16] grayscale-[35%] ${side === "top" ? "top-0" : "bottom-0"}`}
            style={{
              backgroundImage: `url("${driveImageAt(photo, 720).replace(/"/g, "%22")}")`,
            }}
          />
        )}
      </div>
    );
    opening = (
      <div className={rootClass} style={rootStyle}>
        {half("top")}
        {half("bottom")}
        <span
          className="ed-seam absolute top-1/2 left-[calc(50%-4rem)] h-px w-32"
          style={{ background: colors.accent }}
          aria-hidden
        />

        <div className="ed-open-content absolute inset-0 flex flex-col items-center justify-evenly px-6 py-[4svh] text-center">
          {kicker && (
            <p
              className="pp-fade flex items-center gap-2.5 whitespace-nowrap text-[clamp(8px,2.6vw,10px)] tracking-[0.3em] uppercase"
              style={{ color: muted }}
            >
              <span className="h-px w-5 shrink-0" style={{ background: colors.accent }} />
              {kicker}
              <span className="h-px w-5 shrink-0" style={{ background: colors.accent }} />
            </p>
          )}

          <div className="pp-rise relative mx-auto w-fit shrink-0" style={{ ["--d" as string]: 1 }}>
            <div
              className="absolute -inset-2.5 rounded-t-full border"
              style={{ borderColor: `color-mix(in srgb, ${colors.accent} 60%, transparent)` }}
              aria-hidden
            />
            {/* Ancho y alto explícitos (3:4): iOS Safari no deriva bien el ancho de aspect-ratio en flex. */}
            <div
              className="relative overflow-hidden rounded-t-full"
              style={{
                background: C.deep,
                height: "clamp(180px, 30svh, 340px)",
                width: "calc(clamp(180px, 30svh, 340px) * 0.75)",
              }}
            >
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- foto elegida por la pareja
                <img
                  src={driveImageAt(photo, 720)}
                  fetchPriority="high"
                  alt={[p1, p2].filter(Boolean).join(" y ")}
                  className="ed-drift h-full w-full object-cover"
                  style={framingStyle(photoFraming)}
                />
              ) : (
                <span
                  className="flex h-full items-center justify-center text-6xl italic"
                  style={{ fontFamily: SERIF, color: C.cream }}
                >
                  {p1[0]}
                  <span style={{ color: C.accent }}>&amp;</span>
                  {p2[0]}
                </span>
              )}
            </div>
          </div>

          <div className="pp-rise" style={{ ["--d" as string]: 3 }}>
            <p className="text-[10px] tracking-[0.45em] uppercase" style={{ color: muted }}>
              Una invitación para
            </p>
            <p className="mt-1 text-[clamp(2.4rem,11vw,3.6rem)] leading-[1.05]" style={{ fontFamily: SCRIPT }}>
              {guest?.fullName ?? "ti"}
            </p>
          </div>

          <div className="pp-rise" style={{ ["--d" as string]: 5 }}>
            <p className="text-[clamp(1.7rem,8vw,2.4rem)] italic leading-tight" style={{ fontFamily: SERIF }}>
              {first1 || "Nuestra boda"}
              {first1 && first2 && <> {amp} </>}
              {first2}
            </p>
            <p className="mt-2 text-[clamp(8px,2.5vw,10px)] tracking-[0.25em] uppercase" style={{ color: muted }}>
              {[headline, dateLine].filter(Boolean).join(" · ")}
            </p>
          </div>

          <div className="pp-rise flex flex-col items-center gap-3" style={{ ["--d" as string]: 7 }}>
            <button
              type="button"
              onClick={open}
              aria-label="Abrir la invitación"
              className="ed-seal ed-breathe flex size-[5.25rem] items-center justify-center rounded-full text-xl italic outline-none ring-1 ring-[#a8996a]/70 ring-offset-4 focus-visible:ring-2"
              style={{
                fontFamily: SERIF,
                color: C.cream,
                background: "radial-gradient(circle at 35% 30%, #5d6444, #343a26 70%)",
                ["--tw-ring-offset-color" as string]: colors.bg,
              }}
            >
              {mono}
            </button>
            <button type="button" onClick={open} className="text-[10px] tracking-[0.4em] uppercase">
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <InvitationView
        {...props}
        design={design}
        started={
          started || !design.blocks.some((b) => b.type === "cover" && !b.hidden)
        }
      />
      {opening}
    </>
  );
}
