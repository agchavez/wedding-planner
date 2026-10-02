"use client";

import { useId, useState, useTransition } from "react";
import { Check, ChevronDown, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FIELD_TRIGGER_CLASS } from "@/components/ui/field-trigger";
import { CATALOG_NAME_MAX, cleanName, nameKey, shouldOfferCreate } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export type ComboboxOption = { value: string; label: string };
export type ComboboxCreateResult = { option: ComboboxOption; created: boolean } | { error: string };

const CREATE_ITEM_VALUE = "__combobox_create__";

/**
 * Buscador con lista de opciones (Popover + Command). Si lo escrito no coincide con
 * ninguna opción, ofrece "Agregar «texto»" y lo crea con `onCreate` (p. ej. en el catálogo
 * de la boda). El valor elegido va en un input oculto con `name`, para usarlo en formularios.
 */
export function Combobox({
  id,
  name,
  options,
  defaultValue = "",
  placeholder = "Selecciona…",
  searchPlaceholder = "Buscar…",
  emptyOption,
  onCreate,
  createNoun = "opción",
  createdSuffix = "agregada",
  required = false,
  className,
}: {
  id?: string;
  name: string;
  options: ComboboxOption[];
  defaultValue?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  /** Opción para dejar el campo sin valor (ej. "Sin especificar"). */
  emptyOption?: ComboboxOption;
  /** Crea una opción nueva a partir de lo escrito; sin esto no se ofrece "Agregar". */
  onCreate?: (label: string) => Promise<ComboboxCreateResult>;
  /** Cómo se llama lo que se agrega, para los textos: "proveedor", "cuenta"… */
  createNoun?: string;
  /** Concordancia del aviso: "agregado" / "agregada". */
  createdSuffix?: string;
  required?: boolean;
  className?: string;
}) {
  const fallbackId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [value, setValue] = useState(defaultValue);
  const [created, setCreated] = useState<ComboboxOption[]>([]);
  const [isCreating, startCreating] = useTransition();

  const items = [...options, ...created.filter((c) => !options.some((o) => o.value === c.value))];
  const selected = items.find((o) => o.value === value);
  const isEmptyValue = !value || value === emptyOption?.value;
  // Un valor antiguo que ya no está en la lista (texto libre de antes) se sigue mostrando tal cual.
  const displayLabel = isEmptyValue ? (emptyOption && value === emptyOption.value ? emptyOption.label : "") : selected?.label ?? value;
  const offerCreate = Boolean(onCreate) && shouldOfferCreate(query, items.map((o) => o.label));

  function choose(next: string) {
    setValue(next);
    setOpen(false);
  }

  function create() {
    const label = cleanName(query);
    if (!onCreate || !label) return;
    startCreating(async () => {
      try {
        const result = await onCreate(label);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        setCreated((current) =>
          current.some((o) => o.value === result.option.value) ? current : [...current, result.option]
        );
        choose(result.option.value);
        if (result.created) toast.success(`${capitalize(createNoun)} "${result.option.label}" ${createdSuffix}`);
        else toast.info(`"${result.option.label}" ya existía; quedó seleccionado.`);
      } catch {
        toast.error(`No se pudo agregar. Inténtalo de nuevo.`);
      }
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setQuery("");
      }}
    >
      <input type="hidden" name={name} value={isEmptyValue && !emptyOption ? "" : value} />
      {required && (
        // Validación nativa del formulario (el input oculto no admite `required`). La validez se
        // recalcula en cada render: si solo se limpiara al escribir, elegir una opción después de
        // un intento fallido dejaría el formulario bloqueado.
        <input
          ref={(el) => el?.setCustomValidity(isEmptyValue ? "Selecciona o agrega una opción." : "")}
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute size-px opacity-0"
          required
          value={isEmptyValue ? "" : value}
          onChange={() => {}}
        />
      )}
      <PopoverTrigger
        render={
          <Button
            id={id ?? fallbackId}
            type="button"
            variant="outline"
            aria-required={required || undefined}
            className={cn(FIELD_TRIGGER_CLASS, !displayLabel && "text-muted-foreground", className)}
          />
        }
      >
        <span className="truncate">{displayLabel || placeholder}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) min-w-72 p-0" align="start">
        <Command>
          <CommandInput
            value={query}
            onValueChange={(v) => setQuery(v.slice(0, CATALOG_NAME_MAX))}
            placeholder={onCreate ? `${searchPlaceholder} o agregar` : searchPlaceholder}
            disabled={isCreating}
          />
          <CommandList>
            {!offerCreate && (
              <CommandEmpty>
                <span className="text-xs text-muted-foreground">
                  {query.trim()
                    ? "Sin resultados."
                    : onCreate
                      ? `Escribe para buscar o agregar ${articleFor(createNoun)} ${createNoun}.`
                      : "Sin opciones."}
                </span>
              </CommandEmpty>
            )}
            <CommandGroup>
              {emptyOption && (
                <CommandItem value={emptyOption.label} onSelect={() => choose(emptyOption.value)}>
                  <span className="flex-1 text-muted-foreground">{emptyOption.label}</span>
                  {isEmptyValue && <Check className="size-4" />}
                </CommandItem>
              )}
              {items.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  keywords={[nameKey(option.label)]}
                  onSelect={() => choose(option.value)}
                >
                  <span className="flex-1 truncate">{option.label}</span>
                  {option.value === value && <Check className="size-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
            {offerCreate && (
              // Grupo propio y siempre visible: cmdk oculta un grupo entero cuando ninguna de
              // sus opciones coincide con la búsqueda, y "Agregar" nunca coincide.
              <CommandGroup forceMount>
                <CommandItem forceMount value={CREATE_ITEM_VALUE} onSelect={create} disabled={isCreating}>
                  {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4 text-primary" />}
                  <span className="min-w-0 break-words">
                    Agregar {createNoun} <span className="font-medium">&ldquo;{cleanName(query)}&rdquo;</span>
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function articleFor(noun: string) {
  return /a$/.test(noun) ? "una" : "un";
}
