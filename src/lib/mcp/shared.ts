import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit-log";
import { parseDateOnly, toDateOnlyValue } from "@/lib/format";
import type { McpAuthContext } from "@/lib/mcpTokens";

/** Utilidades comunes a todas las herramientas del servidor MCP (/api/mcp). */

export type Ctx = { http?: { authInfo?: { extra?: Record<string, unknown> } } };

export function auth(ctx: unknown): McpAuthContext {
  const value = (ctx as Ctx).http?.authInfo?.extra?.wedding as McpAuthContext | undefined;
  if (!value) throw new Error("No autenticado.");
  return value;
}

/** Igual que auth(), pero exige permiso de edición. */
export function editor(ctx: unknown): McpAuthContext {
  const a = auth(ctx);
  if (!a.canEdit) throw new Error("Tu rol en esta boda es de solo lectura.");
  return a;
}

export function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export async function log(a: McpAuthContext, action: string, summary: string, targetId?: string) {
  await recordAudit({
    action,
    category: "data",
    summary: `${summary} (vía asistente de IA)`,
    actor: { id: a.userId, name: a.userName, email: "" },
    weddingId: a.weddingId,
    targetId: targetId ?? null,
    userAgent: "mcp",
  });
}

export function wedding(a: McpAuthContext) {
  return prisma.wedding.findUniqueOrThrow({ where: { id: a.weddingId } });
}

/** Ids de Mongo: un id mal formado haría fallar la consulta de Prisma con un error poco claro. */
export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Id no válido");

// Solo http(s): z.string().url() también acepta javascript:, data:, etc.
export const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((u) => /^https?:\/\//i.test(u), "Solo enlaces http(s)")
  .or(z.literal(""));

/** Fecha sin hora; "" la borra. */
export const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD").or(z.literal(""));

export const money = z.number().min(0).max(1_000_000_000);

export { parseDateOnly, toDateOnlyValue };

/** Reordena documentos según la lista de ids (mismo esquema de sortOrder que la app). */
export async function reorder(ids: string[], update: (id: string, sortOrder: number) => Promise<unknown>) {
  // MongoDB standalone no soporta transacciones de Prisma: aceptable para un orden cosmético.
  await Promise.all(ids.map((id, index) => update(id, index * 1000)));
}

/** Archivo enviado en base64 por el asistente → File, para reutilizar las funciones de subida. */
export const fileInput = z.object({
  name: z.string().min(1).max(200),
  mimeType: z.string().max(100),
  base64: z.string().max(14_000_000).describe("Contenido del archivo en base64 (máx. 10 MB)"),
});

export function toFile(input: z.infer<typeof fileInput>) {
  const buffer = Buffer.from(input.base64, "base64");
  if (buffer.length === 0) throw new Error("El archivo está vacío.");
  return new File([buffer], input.name, { type: input.mimeType });
}
