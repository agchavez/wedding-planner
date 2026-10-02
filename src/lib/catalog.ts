/**
 * Catálogos de la boda que se pueden ampliar desde un buscador (proveedores, grupos de
 * invitados, cuentas y categorías de gasto): validación de nombres y detección de duplicados.
 * Sin dependencias de servidor, para usarlo igual en el cliente y en las server actions.
 */

export const CATALOG_NAME_MAX = 60;

export type CatalogKind = "vendor" | "group" | "account" | "category";

export const CATALOG_NOUN: Record<CatalogKind, { one: string; article: "el" | "la" }> = {
  vendor: { one: "proveedor", article: "el" },
  group: { one: "grupo", article: "el" },
  account: { one: "cuenta", article: "la" },
  category: { one: "categoría", article: "la" },
};

/** Quita espacios de más: "  Flores   Bella " → "Flores Bella". */
export function cleanName(raw: unknown): string {
  return typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
}

/** Clave para comparar nombres: sin mayúsculas, acentos ni espacios de más ("Música " = "musica"). */
export function nameKey(raw: string): string {
  return cleanName(raw)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export type NameCheck = { ok: true; name: string } | { ok: false; error: string };

/** Valida el nombre de un elemento de catálogo. */
export function validateCatalogName(raw: unknown, kind: CatalogKind): NameCheck {
  const name = cleanName(raw);
  const noun = CATALOG_NOUN[kind].one;
  if (!name) return { ok: false, error: `Escribe el nombre ${CATALOG_NOUN[kind].article === "la" ? "de la" : "del"} ${noun}.` };
  if (name.length > CATALOG_NAME_MAX) {
    return { ok: false, error: `El nombre es muy largo (máximo ${CATALOG_NAME_MAX} caracteres).` };
  }
  return { ok: true, name };
}

/** Elemento con el mismo nombre (según nameKey), si existe. `exceptId` excluye al que se está editando. */
export function findSameName<T extends { name: string; id?: string }>(items: T[], name: string, exceptId?: string) {
  const key = nameKey(name);
  return items.find((item) => item.id !== exceptId && nameKey(item.name) === key);
}

/** Mensaje de duplicado para mostrar al usuario. */
export function duplicateError(kind: CatalogKind, existing: string) {
  const { one, article } = CATALOG_NOUN[kind];
  return `Ya existe ${article === "la" ? "una" : "un"} ${one} llamad${article === "la" ? "a" : "o"} "${existing}".`;
}

/**
 * ¿El buscador debe ofrecer "Agregar «texto»"? Solo si hay texto válido y no coincide
 * exactamente (según nameKey) con una opción existente.
 */
export function shouldOfferCreate(query: string, labels: string[]): boolean {
  const name = cleanName(query);
  if (!name || name.length > CATALOG_NAME_MAX) return false;
  const key = nameKey(name);
  return !labels.some((label) => nameKey(label) === key);
}

/** Opciones sin duplicados (según nameKey), conservando la primera aparición y el orden alfabético. */
export function uniqueSortedLabels(labels: string[]): string[] {
  const seen = new Map<string, string>();
  for (const label of labels) {
    const name = cleanName(label);
    if (name && !seen.has(nameKey(name))) seen.set(nameKey(name), name);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "es"));
}
