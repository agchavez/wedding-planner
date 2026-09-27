"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { FIELD_TRIGGER_CLASS } from "@/components/ui/field-trigger";

/**
 * Campo de texto con autocompletar (Popover + Command): sugiere valores ya usados
 * antes, pero permite escribir uno nuevo libremente — no es un select cerrado.
 */
export function Combobox({
  name,
  defaultValue,
  suggestions,
  placeholder = "Escribe o selecciona…",
  className,
}: {
  name: string;
  defaultValue?: string;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <input type="hidden" name={name} value={value} />
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(FIELD_TRIGGER_CLASS, !value && "text-muted-foreground", className)}
          />
        }
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput value={value} onValueChange={setValue} placeholder="Buscar o escribir…" />
          <CommandList>
            <CommandEmpty>
              <span className="text-xs">
                {value ? <>Se creará &quot;{value}&quot; como opción nueva.</> : "Escribe para buscar o crear uno nuevo."}
              </span>
            </CommandEmpty>
            <CommandGroup>
              {suggestions.map((s) => (
                <CommandItem
                  key={s}
                  value={s}
                  onSelect={(v) => {
                    setValue(v);
                    setOpen(false);
                  }}
                >
                  {s}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
