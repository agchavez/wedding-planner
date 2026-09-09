"use client";

import { ChevronDown } from "lucide-react";
import { useCanvasStore } from "@/app/distribucion/canvasStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ELEMENT_ICONS, ELEMENT_LABELS, TOOL_GROUPS } from "@/lib/seatGeometry";

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
