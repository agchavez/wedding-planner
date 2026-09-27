"use client";

import { useState } from "react";
import type { DailyPoint } from "@/lib/admin-data";

const dayLabel = new Intl.DateTimeFormat("es-HN", { day: "numeric", month: "short", timeZone: "UTC" });
const weekday = new Intl.DateTimeFormat("es-HN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function parse(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

/** Cambios en bodas por día: barras finas de una sola serie, con tooltip y tabla. */
export function ActivityChart({ series }: { series: DailyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...series.map((p) => p.count));
  const niceMax = max <= 5 ? 5 : Math.ceil(max / 5) * 5;
  const total = series.reduce((sum, p) => sum + p.count, 0);
  const active = hover !== null ? series[hover] : null;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-heading text-2xl font-semibold tabular-nums text-foreground">{total}</span> cambios en 14 días
        </p>
        <p className="h-5 text-right text-xs text-muted-foreground" aria-live="polite">
          {active && (
            <>
              <span className="font-medium text-foreground tabular-nums">{active.count}</span> el {weekday.format(parse(active.date))}
            </>
          )}
        </p>
      </div>

      <div className="relative h-40" onMouseLeave={() => setHover(null)}>
        {/* Rejilla recesiva: base, mitad y máximo. */}
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-border/70" style={{ bottom: `${f * 100}%` }}>
            <span className="absolute -top-2 right-0 bg-card pl-1 text-[10px] tabular-nums text-muted-foreground">
              {Math.round(niceMax * f)}
            </span>
          </div>
        ))}
        <div className="absolute inset-0 right-6 flex items-end gap-[2px]">
          {series.map((p, i) => (
            <button
              key={p.date}
              type="button"
              className="group relative flex h-full flex-1 items-end focus-visible:outline-none"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${p.count} cambios el ${weekday.format(parse(p.date))}`}
            >
              <span
                className={`block w-full rounded-t-[4px] transition-opacity ${
                  hover === null || hover === i ? "bg-primary" : "bg-primary/40"
                } group-focus-visible:ring-2 group-focus-visible:ring-ring`}
                style={{ height: p.count ? `${Math.max(3, (p.count / niceMax) * 100)}%` : "2px", opacity: p.count ? 1 : 0.35 }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between pr-6 text-[11px] text-muted-foreground">
        <span>{dayLabel.format(parse(series[0].date))}</span>
        <span>{dayLabel.format(parse(series[6].date))}</span>
        <span>Hoy</span>
      </div>

      <details className="mt-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground">Ver datos en tabla</summary>
        <table className="mt-2 w-full">
          <tbody>
            {series.map((p) => (
              <tr key={p.date} className="border-t border-border">
                <td className="py-1">{weekday.format(parse(p.date))}</td>
                <td className="py-1 text-right tabular-nums text-foreground">{p.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
