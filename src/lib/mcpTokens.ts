import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { mongoDb } from "@/lib/mongo";
import { idMatch } from "@/lib/ids";
import { canEditWedding, parseWeddingRole } from "@/lib/permissions";

const TOKEN_PREFIX = "wp_mcp_";

export function hashMcpToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Token nuevo en texto plano (se muestra una sola vez) y lo que se guarda de él. */
export function generateMcpToken() {
  const token = `${TOKEN_PREFIX}${randomBytes(24).toString("base64url")}`;
  return { token, tokenHash: hashMcpToken(token), prefix: token.slice(0, TOKEN_PREFIX.length + 6) };
}

export type McpAuthContext = {
  tokenId: string;
  weddingId: string;
  userId: string;
  userName: string;
  canEdit: boolean;
};

/**
 * Valida un token del servidor MCP. Además del token, exige que quien lo creó siga siendo
 * participante de la boda: si lo sacan de la boda, sus tokens dejan de funcionar.
 */
export async function verifyMcpToken(bearer: string | undefined): Promise<McpAuthContext | null> {
  if (!bearer?.startsWith(TOKEN_PREFIX)) return null;
  const record = await prisma.mcpToken.findFirst({ where: { tokenHash: hashMcpToken(bearer) } });
  if (!record || record.revokedAt) return null;

  const member = await mongoDb
    .collection("member")
    .findOne({ userId: idMatch(record.createdById), organizationId: idMatch(record.weddingId) });
  if (!member) return null;

  // lastUsedAt con poca precisión: no se escribe en cada llamada.
  if (!record.lastUsedAt || Date.now() - record.lastUsedAt.getTime() > 5 * 60_000) {
    await prisma.mcpToken.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });
  }

  return {
    tokenId: record.id,
    weddingId: record.weddingId,
    userId: record.createdById,
    userName: record.createdByName,
    canEdit: canEditWedding(parseWeddingRole(member.role)),
  };
}
