"use server";

import { revalidatePath } from "next/cache";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";
import { CATALOG_NOUN, type CatalogKind } from "@/lib/catalog";
import { checkCatalogName, createCatalogItem, type CatalogItem } from "@/lib/catalog-server";

const KINDS: CatalogKind[] = ["vendor", "group", "account", "category"];

const AUDIT_ACTION: Record<CatalogKind, string> = {
  vendor: "vendor.create",
  group: "guest_group.create",
  account: "account.create",
  category: "budget_category.create",
};

const PATHS: Record<CatalogKind, string[]> = {
  vendor: ["/configuracion", "/gastos"],
  group: ["/configuracion", "/invitados"],
  account: ["/configuracion", "/gastos"],
  category: ["/configuracion", "/presupuesto", "/gastos", "/"],
};

export type QuickCreateResult = { ok: true; item: CatalogItem; created: boolean } | { ok: false; error: string };

/**
 * "Agregar «nombre»" desde un buscador: crea el elemento en el catálogo de la boda. Si ya
 * existe uno equivalente (sin acentos ni mayúsculas), lo devuelve en vez de duplicarlo.
 */
export async function quickCreateCatalogItem(kind: CatalogKind, rawName: string): Promise<QuickCreateResult> {
  if (!KINDS.includes(kind)) return { ok: false, error: "Catálogo desconocido." };
  const weddingId = await getEditableWeddingId();

  const check = await checkCatalogName(kind, weddingId, rawName);
  if (!check.ok) {
    return check.existing ? { ok: true, item: check.existing, created: false } : { ok: false, error: check.error };
  }

  const item = await createCatalogItem(kind, weddingId, check.name);
  const { one, article } = CATALOG_NOUN[kind];
  await audit(AUDIT_ACTION[kind], `Creó ${article} ${one} "${item.name}" desde un formulario`, { weddingId, targetId: item.id });

  for (const path of PATHS[kind]) revalidatePath(path);
  return { ok: true, item, created: true };
}
