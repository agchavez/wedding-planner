"use client";

import { Brush, ChevronDown, PenLine, Shapes } from "lucide-react";
import { useCanvasStore } from "@/app/(app)/distribucion/canvasStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROOM_SHAPE_PRESETS } from "@/lib/seatGeometry";
import { formatDimensions, pxToMeters, resolvePxPerMeter } from "@/lib/layoutUnits";

export function RoomShapeControl() {
  const roomEditMode = useCanvasStore((s) => s.roomEditMode);
  const roomDrawMode = useCanvasStore((s) => s.roomDrawMode);
  const applyRoomShapePreset = useCanvasStore((s) => s.applyRoomShapePreset);
  const toggleRoomEditMode = useCanvasStore((s) => s.toggleRoomEditMode);
  const setRoomDrawMode = useCanvasStore((s) => s.setRoomDrawMode);
  const roomShape = useCanvasStore((s) => s.roomShape);
  const pxPerMeter = resolvePxPerMeter(useCanvasStore((s) => s.pxPerMeter));

  // Medidas del contorno (caja que lo encierra), en metros.
  const xs = roomShape.map((p) => p.x);
  const ys = roomShape.map((p) => p.y);
  const outlineSize =
    roomShape.length >= 3
      ? formatDimensions(
          pxToMeters(Math.max(...xs) - Math.min(...xs), pxPerMeter),
          pxToMeters(Math.max(...ys) - Math.min(...ys), pxPerMeter)
        )
      : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <Shapes className="size-3.5" />
        Forma del local
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{outlineSize ? `Contorno: ${outlineSize}` : "Sin contorno definido"}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {ROOM_SHAPE_PRESETS.map((preset) => (
          <DropdownMenuItem key={preset.value} onClick={() => applyRoomShapePreset(preset.value)}>
            <Shapes className="size-4" />
            {preset.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={roomDrawMode} onCheckedChange={(checked) => setRoomDrawMode(checked)}>
          <Brush className="size-4" />
          Dibujar forma a mano libre
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={roomEditMode} onCheckedChange={() => toggleRoomEditMode()}>
          <PenLine className="size-4" />
          Editar salón (forma y elementos fijos)
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
