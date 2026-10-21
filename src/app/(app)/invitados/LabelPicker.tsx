"use client";

import { useMemo, useState, useTransition, type ReactElement } from "react";
import { Check, Plus, Search, Tags } from "lucide-react";
import { toast } from "sonner";
import { createLabel } from "@/app/(app)/invitados/labels-actions";
import { LabelChip, LabelDot } from "@/app/(app)/invitados/LabelChip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { nameKey, shouldOfferCreate } from "@/lib/catalog";
import type { LabelOption } from "@/lib/guestLabels";
import { cn } from "@/lib/utils";

/**
 * Selector múltiple de etiquetas con búsqueda y "Crear «texto»". Con `name`, agrega inputs
 * ocultos para enviarlas en un formulario.
 */
export function LabelPicker({
  labels,
  value,
  onChange,
  name,
  allowCreate = true,
  onLabelCreated,
  triggerRender,
  placeholder = "Agregar etiquetas",
}: {
  labels: LabelOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  name?: string;
  allowCreate?: boolean;
  onLabelCreated?: (label: LabelOption) => void;
  triggerRender?: ReactElement;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const byId = useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels]);
  const filtered = labels.filter((l) => nameKey(l.name).includes(nameKey(query)));
  const canCreate = allowCreate && shouldOfferCreate(query, labels.map((l) => l.name));

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  function create() {
    startTransition(async () => {
      const result = await createLabel(query);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onLabelCreated?.(result.label);
      onChange([...new Set([...value, result.label.id])]);
      setQuery("");
    });
  }

  const selected = value.map((id) => byId.get(id)).filter(Boolean) as LabelOption[];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {name && value.map((id) => <input key={id} type="hidden" name={name} value={id} />)}
      {!triggerRender &&
        selected.map((l) => <LabelChip key={l.id} name={l.name} color={l.color} onRemove={() => toggle(l.id)} />)}
      <Popover>
        {triggerRender ? (
          <PopoverTrigger render={triggerRender} />
        ) : (
          <PopoverTrigger
            render={<Button type="button" variant="outline" size="xs" className="border-dashed text-muted-foreground" />}
          >
            <Tags className="size-3" />
            {selected.length === 0 ? placeholder : "Editar"}
          </PopoverTrigger>
        )}
        <PopoverContent align="start" className="w-64 gap-1 p-1.5">
          <div className="flex items-center gap-2 border-b border-border px-2 pb-1.5">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (canCreate) create();
                  else if (filtered[0]) toggle(filtered[0].id);
                }
              }}
              placeholder={allowCreate ? "Buscar o crear etiqueta" : "Buscar etiqueta"}
              className="h-7 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.map((l) => {
              const checked = value.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggle(l.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <LabelDot color={l.color} />
                  <span className="flex-1 truncate">{l.name}</span>
                  <Check className={cn("size-3.5 text-primary", !checked && "invisible")} />
                </button>
              );
            })}
            {filtered.length === 0 && !canCreate && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                {labels.length === 0 ? "Escribe para crear tu primera etiqueta" : "Sin resultados"}
              </p>
            )}
            {canCreate && (
              <button
                type="button"
                onClick={create}
                disabled={isPending}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-primary hover:bg-muted disabled:opacity-50"
              >
                <Plus className="size-3.5" />
                Crear «{query.trim()}»
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
