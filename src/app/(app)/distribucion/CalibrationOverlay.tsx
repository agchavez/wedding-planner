"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ruler } from "lucide-react";
import { useCanvasStore } from "@/app/(app)/distribucion/canvasStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMeters, pxToMeters, resolvePxPerMeter } from "@/lib/layoutUnits";
import { calibrateScale } from "@/lib/venueLibrary";
import type { RoomPoint } from "@/lib/seatGeometry";

/**
 * Calibración de escala por dos puntos (sobre el plano): pide marcar dos puntos de medida
 * conocida y la distancia real en metros. Las mesas conservan su tamaño real al aplicarla.
 */
export function CalibrationOverlay() {
  const points = useCanvasStore((s) => s.calibrationPoints);
  const pxPerMeter = resolvePxPerMeter(useCanvasStore((s) => s.pxPerMeter));
  const cancelCalibration = useCanvasStore((s) => s.cancelCalibration);
  if (!points) return null;

  const [a, b] = points;
  const measured = a && b ? pxToMeters(Math.hypot(b.x - a.x, b.y - a.y), pxPerMeter) : null;

  return (
    <div className="absolute inset-x-2 top-12 z-10 flex justify-center">
      <div className="flex max-w-full flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-md">
        <Ruler className="size-4 text-primary" />
        {measured === null || !a || !b ? (
          <span>
            Calibrar escala: marca el <b>{a ? "segundo" : "primer"}</b> punto de una medida conocida (por ejemplo, un muro).
          </span>
        ) : (
          // Solo existe con los dos puntos marcados: al cancelar o volver a marcar se desmonta y la
          // distancia escrita no se reutiliza para otra medida.
          <CalibrationForm a={a} b={b} measured={measured} />
        )}
        <Button size="xs" variant="outline" onClick={cancelCalibration}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function CalibrationForm({ a, b, measured }: { a: RoomPoint; b: RoomPoint; measured: number }) {
  const cancelCalibration = useCanvasStore((s) => s.cancelCalibration);
  const applyCalibration = useCanvasStore((s) => s.applyCalibration);
  const startCalibration = useCanvasStore((s) => s.startCalibration);
  const [meters, setMeters] = useState("");

  function apply() {
    const result = calibrateScale(a, b, Number(meters.replace(",", ".")));
    if (!result.ok) return void toast.error(result.error);
    applyCalibration(result.pxPerMeter);
    toast.success("Escala calibrada. Las mesas conservan su tamaño real (Ctrl+Z para deshacer).");
  }

  return (
    <form
      // contents: los campos se acomodan en la misma fila que el ícono y "Cancelar".
      className="contents"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <label htmlFor="calibration-meters">
        Distancia real entre los puntos <span className="text-muted-foreground">(hoy mide {formatMeters(measured)})</span>
      </label>
      <Input
        id="calibration-meters"
        autoFocus
        inputMode="decimal"
        value={meters}
        onChange={(e) => setMeters(e.target.value)}
        // El atajo global de Escape ignora los campos de texto: aquí también cancela.
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            cancelCalibration();
          }
        }}
        placeholder="m"
        className="h-7 w-20"
      />
      <span>m</span>
      <Button size="xs" type="submit" disabled={!meters.trim()}>
        Aplicar
      </Button>
      <Button size="xs" variant="ghost" type="button" onClick={startCalibration}>
        Volver a marcar
      </Button>
    </form>
  );
}
