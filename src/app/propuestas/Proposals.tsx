"use client";

import { useEffect, useState } from "react";
import "./propuestas.css";
import type { Guest } from "./shared";
import { Editorial } from "./styles/Editorial";
import { Terracota } from "./styles/Terracota";
import { Gala } from "./styles/Gala";
import { Minimal } from "./styles/Minimal";

const STYLES = [
  { key: "editorial", name: "Editorial", dot: "#121212", C: Editorial },
  { key: "terracota", name: "Terracota", dot: "#a75a3f", C: Terracota },
  { key: "gala", name: "Gala", dot: "#cfae6b", C: Gala },
  { key: "minimal", name: "Minimal", dot: "#e6e1d7", C: Minimal },
] as const;

export function Proposals({ initial, guest }: { initial: string; guest: Guest }) {
  const [current, setCurrent] = useState(STYLES.some((s) => s.key === initial) ? initial : "editorial");
  const [hidden, setHidden] = useState(false);
  const style = STYLES.find((s) => s.key === current)!;

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("estilo", current);
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0 });
  }, [current]);

  return (
    <>
      <style.C key={current} guest={guest} />
      <nav
        className={`fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-1 rounded-full border border-black/10 bg-white/85 p-1 shadow-xl backdrop-blur transition-transform ${hidden ? "translate-y-[calc(100%+1rem)]" : ""}`}
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        {STYLES.map((s) => (
          <button
            key={s.key}
            onClick={() => setCurrent(s.key)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition sm:px-4 ${current === s.key ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-black/5"}`}
          >
            <span className="size-2.5 rounded-full ring-1 ring-black/20" style={{ background: s.dot }} />
            <span className={current === s.key ? "" : "hidden sm:inline"}>{s.name}</span>
          </button>
        ))}
        <button onClick={() => setHidden(true)} aria-label="Ocultar selector" className="rounded-full px-2 py-2 text-xs text-neutral-500 hover:bg-black/5">
          ✕
        </button>
      </nav>
      {hidden && (
        <button
          onClick={() => setHidden(false)}
          className="fixed right-4 bottom-4 z-[60] rounded-full bg-neutral-900/80 px-3 py-2 text-xs text-white shadow-lg"
        >
          Estilos
        </button>
      )}
    </>
  );
}
