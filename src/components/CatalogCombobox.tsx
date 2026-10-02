"use client";

import { quickCreateCatalogItem } from "@/app/(app)/catalog-actions";
import { Combobox, type ComboboxCreateResult, type ComboboxOption } from "@/components/ui/combobox";
import { CATALOG_NOUN, type CatalogKind } from "@/lib/catalog";

/**
 * Buscador de un catálogo de la boda (proveedores, grupos, cuentas o categorías) que permite
 * agregar un elemento nuevo sin salir del formulario. `valueBy` indica qué se guarda en el
 * formulario: el nombre (campos de texto como Expense.vendor) o el id (relaciones).
 */
export function CatalogCombobox({
  kind,
  valueBy,
  ...props
}: {
  kind: CatalogKind;
  valueBy: "name" | "id";
  id?: string;
  name: string;
  options: ComboboxOption[];
  defaultValue?: string;
  placeholder?: string;
  emptyOption?: ComboboxOption;
  required?: boolean;
  className?: string;
}) {
  const noun = CATALOG_NOUN[kind];

  async function onCreate(label: string): Promise<ComboboxCreateResult> {
    const result = await quickCreateCatalogItem(kind, label);
    if (!result.ok) return { error: result.error };
    const { id, name } = result.item;
    return { option: { value: valueBy === "id" ? id : name, label: name }, created: result.created };
  }

  return (
    <Combobox
      {...props}
      searchPlaceholder={`Buscar ${noun.one}`}
      onCreate={onCreate}
      createNoun={noun.one}
      createdSuffix={noun.article === "la" ? "agregada" : "agregado"}
    />
  );
}
