"use client";

import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
            className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}
          />
        }
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput value={value} onValueChange={setValue} placeholder="Buscar o escribir…" />
          <CommandList>
            <CommandEmpty>
              <span className="text-xs">Sin coincidencias — se usará &quot;{value}&quot;.</span>
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
