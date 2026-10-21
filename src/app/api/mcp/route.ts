import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerWeddingTools } from "@/lib/mcp/weddingTools";
import { verifyMcpToken } from "@/lib/mcpTokens";

/**
 * Servidor MCP (Streamable HTTP) para asistentes de IA. Cada token (Configuración →
 * Asistente de IA) da acceso a una sola boda; se envía como `Authorization: Bearer <token>`.
 */
const handler = createMcpHandler(
  (server) => {
    registerWeddingTools(server);
  },
  {
    serverInfo: { name: "wedplan", version: "1.0.0" },
    instructions:
      "Herramientas para gestionar los invitados y las invitaciones digitales de una boda en Wedplan. " +
      "Empieza con wedding_overview. Los invitados tienen lado (novia/novio/ambos) y etiquetas. " +
      "Para enviar invitaciones usa get_invitation_links: devuelve enlaces de WhatsApp que la persona abre para enviar; luego mark_invitations_sent.",
  }
);

const authHandler = withMcpAuth(
  handler,
  async (_req, bearerToken) => {
    const ctx = await verifyMcpToken(bearerToken);
    if (!ctx) return undefined;
    return { token: bearerToken!, clientId: ctx.tokenId, scopes: ctx.canEdit ? ["read", "write"] : ["read"], extra: { wedding: ctx } };
  },
  { required: true }
);

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
