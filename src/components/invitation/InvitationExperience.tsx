"use client";

import { useEffect, useMemo, useState } from "react";
import { InvitationView, effectiveData, type InvitationViewProps } from "@/components/invitation/InvitationView";
import { C, SCRIPT, SERIF, eventDay } from "@/components/invitation/kit";
import { designFromData, findBlock } from "@/lib/invitationBlocks";

/**
 * Invitación pública: primero la pantalla de apertura (lino, foto de la pareja en un arco y el
 * nombre del invitado). Al tocar el sello, el contenido se desvanece y el telón se abre en dos
 * mitades sobre la portada, que empieza su animación a la vista. Textos y foto salen del
 * bloque de portada (editable).
 */
export function InvitationExperience(props: InvitationViewProps) {
  const { data, guest } = props;
  const design = useMemo(() => props.design ?? designFromData(data), [props.design, data]);
  const [stage, setStage] = useState<"closed" | "opening" | "done">("closed");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (stage === "done") return;
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    return () => {
      el.style.overflow = prev;
    };
  }, [stage]);

  function open() {
    if (stage !== "closed") return;
    window.scrollTo({ top: 0 });
    setStage("opening");
    setTimeout(() => setStarted(true), 900);
    setTimeout(() => setStage("done"), 1900);
  }

  const cover = findBlock(design, "cover", true) ?? findBlock(design, "cover");
  const photo = cover?.props.openingPhotoUrl || cover?.props.photoUrl || "";
  const fx = effectiveData(data, design);
  const start = fx.ceremonyTime ?? fx.receptionTime ?? data.weddingDate;
  const day = eventDay(start, Boolean(fx.ceremonyTime || fx.receptionTime));
  const p1 = data.partner1.trim();
  const p2 = data.partner2.trim();
  const mono = [p1[0], p2[0]].filter(Boolean).join("·").toUpperCase() || "♥";
  const kicker = [cover?.props.openingKicker, day?.dots].filter(Boolean).join(" · ");
  const headline = (cover?.props.headline || "Nos casamos").replace(/[¡!]/g, "");
  const dateLine = day ? `${day.day} de ${day.monthName} de ${day.year}` : "";

  const half = (side: "top" | "bottom") => (
    <div className={`ed-half ed-half-${side} ed-linen absolute inset-x-0 h-1/2 overflow-hidden ${side === "top" ? "top-0" : "bottom-0"}`}>
      {photo && (
        <div
          className={`absolute inset-x-0 h-[100svh] bg-cover bg-center opacity-[0.16] grayscale-[35%] ${side === "top" ? "top-0" : "bottom-0"}`}
          style={{ backgroundImage: `url("${photo.replace(/"/g, "%22")}")` }}
        />
      )}
    </div>
  );

  return (
    <>
      <InvitationView {...props} design={design} started={started || !design.blocks.some((b) => b.type === "cover" && !b.hidden)} />
      {stage !== "done" && (
        <div className={`ed-opening fixed inset-0 z-50 ${stage !== "closed" ? "open pointer-events-none" : ""}`} style={{ color: C.ink }}>
          {half("top")}
          {half("bottom")}
          <span className="ed-seam absolute top-1/2 left-[calc(50%-4rem)] h-px w-32" style={{ background: C.accent }} aria-hidden />

          <div className="ed-open-content absolute inset-0 flex flex-col items-center justify-evenly px-6 py-[4svh] text-center">
            {kicker && (
              <p className="pp-fade flex items-center gap-3 text-[10px] tracking-[0.45em] uppercase" style={{ color: C.muted }}>
                <span className="h-px w-6" style={{ background: C.accent }} />
                {kicker}
                <span className="h-px w-6" style={{ background: C.accent }} />
              </p>
            )}

            <div className="pp-rise relative" style={{ ["--d" as string]: 1 }}>
              <div className="absolute -inset-2.5 rounded-t-full border" style={{ borderColor: `${C.accent}99` }} aria-hidden />
              <div className="relative aspect-[3/4] h-[30svh] max-h-[340px] min-h-[180px] overflow-hidden rounded-t-full" style={{ background: C.deep }}>
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- foto elegida por la pareja
                  <img src={photo} alt={[p1, p2].filter(Boolean).join(" y ")} className="ed-drift h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-6xl italic" style={{ fontFamily: SERIF, color: C.cream }}>
                    {p1[0]}
                    <span style={{ color: C.accent }}>&amp;</span>
                    {p2[0]}
                  </span>
                )}
              </div>
            </div>

            <div className="pp-rise" style={{ ["--d" as string]: 3 }}>
              <p className="text-[10px] tracking-[0.45em] uppercase" style={{ color: C.muted }}>
                Una invitación para
              </p>
              <p className="mt-1 text-[clamp(2.4rem,11vw,3.6rem)] leading-[1.05]" style={{ fontFamily: SCRIPT }}>
                {guest?.fullName ?? "ti"}
              </p>
            </div>

            <div className="pp-rise" style={{ ["--d" as string]: 5 }}>
              <p className="text-[clamp(1.6rem,7vw,2.2rem)] italic" style={{ fontFamily: SERIF }}>
                {p1 || "Nuestra boda"}
                {p1 && p2 && <span style={{ color: C.accent }}> &amp; </span>}
                {p2}
              </p>
              <p className="mt-2 text-[10px] tracking-[0.35em] uppercase" style={{ color: C.muted }}>
                {[headline, dateLine].filter(Boolean).join(" · ")}
              </p>
            </div>

            <div className="pp-rise flex flex-col items-center gap-3" style={{ ["--d" as string]: 7 }}>
              <button
                type="button"
                onClick={open}
                aria-label="Abrir la invitación"
                className="ed-seal ed-breathe flex size-[5.25rem] items-center justify-center rounded-full text-xl italic outline-none ring-1 ring-[#a8996a]/70 ring-offset-4 ring-offset-[#f2eee3] focus-visible:ring-2"
                style={{ fontFamily: SERIF, color: C.cream, background: "radial-gradient(circle at 35% 30%, #5d6444, #343a26 70%)" }}
              >
                {mono}
              </button>
              <button type="button" onClick={open} className="text-[10px] tracking-[0.4em] uppercase" style={{ color: C.ink }}>
                Abrir invitación
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
