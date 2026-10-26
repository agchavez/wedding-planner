import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerWeddingTools } from "@/lib/mcp/weddingTools";
import { registerBudgetTools } from "@/lib/mcp/budgetTools";
import { registerPlanningTools } from "@/lib/mcp/planningTools";
import { registerSeatingTools } from "@/lib/mcp/seatingTools";
import { verifyMcpToken } from "@/lib/mcpTokens";

/**
 * Servidor MCP (Streamable HTTP) para asistentes de IA. Cada token (Configuración →
 * Asistente de IA) da acceso a una sola boda; se envía como `Authorization: Bearer <token>`.
 */
const handler = createMcpHandler(
  (server) => {
    registerWeddingTools(server);
    registerBudgetTools(server);
    registerPlanningTools(server);
    registerSeatingTools(server);
  },
  {
    serverInfo: { name: "wedplan", version: "2.0.0" },
    instructions:
      "Herramientas para gestionar una boda completa en Wedplan: datos de la boda, invitados (lado novia/novio/ambos, " +
      "etiquetas, grupos, confirmaciones), invitación digital y su envío por WhatsApp, presupuesto, gastos y pagos, " +
      "proveedores y cuentas, eventos y línea de tiempo, música, distribución del salón y mesas, fotos y actividad. " +
      "Empieza con wedding_overview. Los ids salen de las herramientas de listado (list_guests, list_expenses, list_events, get_seating…). " +
      "Para enviar invitaciones usa get_invitation_links: devuelve enlaces de WhatsApp que la persona abre para enviar; luego mark_invitations_sent. " +
      "Las fechas van en formato YYYY-MM-DD y las horas de la línea de tiempo en HH:mm. " +
      "Antes de eliminar algo (herramientas delete_* o action=delete) confirma con la persona.",
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
