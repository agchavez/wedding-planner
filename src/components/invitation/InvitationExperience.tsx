"use client";

import { useEffect, useState } from "react";
import { InvitationView, themeStyle, type InvitationViewProps } from "@/components/invitation/InvitationView";
import { monogram } from "@/lib/invitationThemes";

/** Invitación pública: primero el sobre cerrado con el nombre del invitado; al tocar el sello se abre. */
export function InvitationExperience(props: InvitationViewProps) {
  const { data, guest } = props;
  const [opened, setOpened] = useState(false);
  const [introGone, setIntroGone] = useState(false);

  useEffect(() => {
    if (introGone) {
      document.documentElement.style.overflow = "";
      return;
    }
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [introGone]);

  function open() {
    if (opened) return;
    setOpened(true);
    window.scrollTo({ top: 0 });
    setTimeout(() => setIntroGone(true), 2300);
  }

  const mono = monogram(data.partner1, data.partner2);

  return (
    <>
      <InvitationView {...props} />
      {!introGone && (
        <div
          style={themeStyle(data.theme)}
          className={`inv-root inv-intro fixed inset-0 z-50 flex flex-col items-center justify-center bg-(--inv-bg) px-6 text-(--inv-ink) ${opened ? "is-done" : ""}`}
        >
          <p className="inv-caps text-[0.7rem] text-(--inv-muted)">Una invitación para</p>
          <p className="inv-script mt-2 text-center text-5xl text-(--inv-accent) sm:text-6xl">
            {guest?.fullName ?? "ti"}
          </p>

          <div
            className={`inv-envelope relative mt-10 aspect-[1.45] w-[min(86vw,26rem)] [perspective:1200px] ${opened ? "is-open" : ""}`}
          >
            {/* Fondo del sobre */}
            <div className="absolute inset-0 rounded-md bg-(--inv-envelope) shadow-[0_30px_60px_-30px_rgba(0,0,0,0.45)]" />
            {/* Carta */}
            <div className="inv-envelope-letter inv-paper absolute inset-x-[6%] top-[6%] bottom-[4%] z-10 flex flex-col items-center justify-center rounded-sm border border-(--inv-gold)/40 text-center">
              <span className="text-sm tracking-[0.3em] text-(--inv-gold)">{mono}</span>
              <span className="inv-script mt-1 text-3xl">{[data.partner1, data.partner2].filter(Boolean).join(" & ")}</span>
            </div>
            {/* Bolsillo frontal */}
            <div
              className="absolute inset-0 z-20 rounded-md bg-(--inv-envelope)"
              style={{ clipPath: "polygon(0 0, 50% 52%, 100% 0, 100% 100%, 0 100%)" }}
            />
            <div
              className="absolute inset-0 z-20 rounded-md"
              style={{
                clipPath: "polygon(0 100%, 50% 48%, 100% 100%)",
                background: "linear-gradient(to top, rgba(0,0,0,0.05), transparent)",
              }}
            />
            {/* Solapa */}
            <div
              className="inv-envelope-flap absolute inset-x-0 top-0 h-[60%] bg-(--inv-flap)"
              style={{
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                zIndex: opened ? 5 : 30,
                transition: "transform 0.9s cubic-bezier(0.65,0,0.35,1), z-index 0s linear 0.45s",
              }}
            />
            {/* Sello */}
            <button
              type="button"
              onClick={open}
              aria-label="Abrir la invitación"
              className="inv-envelope-seal inv-seal-pulse absolute top-[60%] left-1/2 z-40 flex size-[4.5rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-(--inv-seal) text-sm tracking-[0.18em] text-(--inv-seal-ink) shadow-[inset_0_-3px_6px_rgba(0,0,0,0.25),0_6px_14px_-4px_rgba(0,0,0,0.4)] outline-none focus-visible:ring-4 focus-visible:ring-(--inv-gold)/50"
            >
              {mono}
            </button>
          </div>

          <button
            type="button"
            onClick={open}
            className="inv-caps mt-10 text-[0.7rem] text-(--inv-muted) transition-colors hover:text-(--inv-accent)"
          >
            Toca el sello para abrir
          </button>
        </div>
      )}
    </>
  );
}
