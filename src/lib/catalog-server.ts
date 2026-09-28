import "server-only";
import { prisma } from "@/lib/prisma";
import { duplicateError, findSameName, validateCatalogName, type CatalogKind, type NameCheck } from "@/lib/catalog";

export type CatalogItem = { id: string; name: string };

/** Elementos del catálogo de la boda (solo id y nombre). */
export function listCatalog(kind: CatalogKind, weddingId: string): Promise<CatalogItem[]> {
  const args = { where: { weddingId }, select: { id: true, name: true } } as const;
  switch (kind) {
    case "vendor":
      return prisma.vendor.findMany(args);
    case "group":
      return prisma.guestGroup.findMany(args);
    case "account":
      return prisma.account.findMany(args);
    case "category":
      return prisma.expenseCategory.findMany(args);
  }
}

/** Valida el nombre y que no exista otro igual en la boda (ignorando acentos y mayúsculas). */
export async function checkCatalogName(
  kind: CatalogKind,
  weddingId: string,
  raw: unknown,
  exceptId?: string
): Promise<NameCheck & { existing?: CatalogItem }> {
  const check = validateCatalogName(raw, kind);
  if (!check.ok) return check;
  const existing = findSameName(await listCatalog(kind, weddingId), check.name, exceptId);
  if (existing) return { ok: false, error: duplicateError(kind, existing.name), existing };
  return check;
}

/** Crea un elemento solo con su nombre (desde un buscador). */
export async function createCatalogItem(kind: CatalogKind, weddingId: string, name: string): Promise<CatalogItem> {
  const select = { id: true, name: true } as const;
  switch (kind) {
    case "vendor":
      return prisma.vendor.create({ data: { weddingId, name }, select });
    case "group":
      return prisma.guestGroup.create({ data: { weddingId, name }, select });
    case "account":
      return prisma.account.create({ data: { weddingId, name }, select });
    case "category": {
      const sortOrder = await prisma.expenseCategory.count({ where: { weddingId } });
      return prisma.expenseCategory.create({ data: { weddingId, name, sortOrder }, select });
    }
  }
}
