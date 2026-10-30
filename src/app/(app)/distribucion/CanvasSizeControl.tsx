"use client";

import { Maximize2 } from "lucide-react";
import { useCanvasStore } from "@/app/(app)/distribucion/canvasStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDimensions, metersToPx, pxToMeters, resolvePxPerMeter } from "@/lib/layoutUnits";

// En metros. Con la escala por defecto equivalen a los tamaños de siempre (1600×1600, 2200×1400, 2800×1800 px).
const PRESETS = [
  { label: "Cuadrado", width: 24, height: 24 },
  { label: "Rectangular", width: 33, height: 21 },
  { label: "Grande", width: 42, height: 27 },
];

export function CanvasSizeControl() {
  const setCanvasSize = useCanvasStore((s) => s.setCanvasSize);
  const canvasWidth = useCanvasStore((s) => s.canvasWidth);
  const canvasHeight = useCanvasStore((s) => s.canvasHeight);
  const pxPerMeter = resolvePxPerMeter(useCanvasStore((s) => s.pxPerMeter));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <Maximize2 className="size-3.5" />
        Forma del salón · {formatDimensions(pxToMeters(canvasWidth, pxPerMeter), pxToMeters(canvasHeight, pxPerMeter), 0)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {PRESETS.map((preset) => (
          <DropdownMenuItem
            key={preset.label}
            onClick={() =>
              setCanvasSize(
                Math.round(metersToPx(preset.width, pxPerMeter)),
                Math.round(metersToPx(preset.height, pxPerMeter))
              )
            }
          >
            {preset.label} ({formatDimensions(preset.width, preset.height, 0)})
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
