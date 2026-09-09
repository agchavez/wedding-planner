"use client";

import { Maximize2 } from "lucide-react";
import { useCanvasStore } from "@/app/distribucion/canvasStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PRESETS = [
  { label: "Cuadrado", width: 1600, height: 1600 },
  { label: "Rectangular", width: 2200, height: 1400 },
  { label: "Grande", width: 2800, height: 1800 },
];

export function CanvasSizeControl() {
  const setCanvasSize = useCanvasStore((s) => s.setCanvasSize);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <Maximize2 className="size-3.5" />
        Forma del salón
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {PRESETS.map((preset) => (
          <DropdownMenuItem key={preset.label} onClick={() => setCanvasSize(preset.width, preset.height)}>
            {preset.label} ({preset.width}×{preset.height})
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
