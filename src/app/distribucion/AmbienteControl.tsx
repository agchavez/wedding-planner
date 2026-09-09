"use client";

import { Building2, Trees } from "lucide-react";
import { useCanvasStore, type Background } from "@/app/distribucion/canvasStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS: { value: Background; label: string; icon: typeof Building2 }[] = [
  { value: "indoor", label: "Interior", icon: Building2 },
  { value: "garden", label: "Jardín (exterior)", icon: Trees },
];

export function AmbienteControl() {
  const background = useCanvasStore((s) => s.background);
  const setBackground = useCanvasStore((s) => s.setBackground);
  const current = OPTIONS.find((o) => o.value === background) ?? OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <current.icon className="size-3.5" />
        {current.label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {OPTIONS.map((opt) => (
          <DropdownMenuItem key={opt.value} onClick={() => setBackground(opt.value)}>
            <opt.icon className="size-4" />
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
