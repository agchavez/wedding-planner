"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId } from "@/lib/wedding";
import { requireSession } from "@/lib/session";
import { audit } from "@/lib/audit";
import { cleanName } from "@/lib/catalog";
import { generateMcpToken } from "@/lib/mcpTokens";

/** Crea un token para el servidor MCP. Devuelve el token en texto plano: solo se muestra esta vez. */
export async function createMcpToken(rawName: string): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const weddingId = await getEditableWeddingId();
  const { user } = await requireSession();
  const name = cleanName(rawName).slice(0, 60) || "Asistente de IA";
  const active = (await prisma.mcpToken.findMany({ where: { weddingId }, select: { revokedAt: true } })).filter((t) => !t.revokedAt).length;
  if (active >= 10) return { ok: false, error: "Ya hay 10 tokens activos; revoca alguno antes de crear otro." };

  const { token, tokenHash, prefix } = generateMcpToken();
  const record = await prisma.mcpToken.create({
    data: { weddingId, name, tokenHash, prefix, createdById: user.id, createdByName: user.name },
  });
  await audit("mcp_token.create", `Creó el token de MCP "${name}"`, { weddingId, targetId: record.id });
  revalidatePath("/configuracion");
  return { ok: true, token };
}

export async function revokeMcpToken(id: string) {
  const weddingId = await getEditableWeddingId();
  const record = await prisma.mcpToken.update({ where: { id, weddingId }, data: { revokedAt: new Date() } });
  await audit("mcp_token.revoke", `Revocó el token de MCP "${record.name}"`, { weddingId, targetId: id });
  revalidatePath("/configuracion");
}
