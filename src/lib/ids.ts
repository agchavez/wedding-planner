import { ObjectId } from "mongodb";

/**
 * Better Auth guarda las referencias (userId, organizationId…) como ObjectId en MongoDB;
 * este filtro acepta ambas formas por si algún documento quedó como string.
 */
export function idMatch(id: string) {
  return ObjectId.isValid(id) ? { $in: [id, new ObjectId(id)] } : id;
}

export function idString(value: unknown): string {
  if (value instanceof ObjectId) return value.toHexString();
  return value == null ? "" : String(value);
}

export function toObjectId(id: string) {
  return new ObjectId(id);
}
