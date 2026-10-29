"use client";

import { BrickWall, ChevronDown, Circle, DoorOpen, LogOut, Martini, PanelTop, Square, type LucideIcon } from "lucide-react";
import { useCanvasStore } from "@/app/(app)/distribucion/canvasStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ELEMENT_ICONS, ELEMENT_LABELS, TOOL_GROUPS } from "@/lib/seatGeometry";
import { FIXTURE_LABELS, FIXTURE_TYPES, type FixtureType } from "@/lib/roomFixtures";

export function Toolbar() {
  const addElement = useCanvasStore((s) => s.addElement);

  return (
    <div className="flex flex-wrap gap-2">
      {TOOL_GROUPS.map((group) => (
        <DropdownMenu key={group.label}>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            {group.label}
            <ChevronDown className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {group.types.map((type) => {
              const Icon = ELEMENT_ICONS[type];
              return (
                <DropdownMenuItem key={type} onClick={() => addElement(type)}>
                  <Icon className="size-4" />
                  {ELEMENT_LABELS[type]}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ))}
    </div>
  );
}

const FIXTURE_ICONS: Record<FixtureType, LucideIcon> = {
  wall: BrickWall,
  column: Square,
  "column-round": Circle,
  door: DoorOpen,
  window: PanelTop,
  "emergency-exit": LogOut,
  bar: Martini,
};

/** Elementos fijos del salón: solo visible en el modo "Editar salón". */
export function RoomFixtureToolbar() {
  const addFixture = useCanvasStore((s) => s.addFixture);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        Elementos fijos
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {FIXTURE_TYPES.map((type) => {
          const Icon = FIXTURE_ICONS[type];
          return (
            <DropdownMenuItem key={type} onClick={() => addFixture(type)}>
              <Icon className="size-4" />
              {FIXTURE_LABELS[type]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
