import { prisma } from "@/lib/prisma";

export type AuditCategory = "auth" | "data" | "admin";

export type AuditEntry = {
  action: string;
  category: AuditCategory;
  summary: string;
  success?: boolean;
  actor?: { id: string; name: string; email: string } | null;
  weddingId?: string | null;
  targetId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

/** IP del cliente tal como la entrega Caddy (primer valor de X-Forwarded-For). */
export function clientIp(h: Headers) {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
}

/** Guarda un evento. Un fallo al auditar nunca rompe la acción del usuario. */
export async function recordAudit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        category: entry.category,
        summary: entry.summary.slice(0, 300),
        success: entry.success ?? true,
        actorId: entry.actor?.id ?? null,
        actorName: entry.actor?.name ?? "",
        actorEmail: entry.actor?.email ?? "",
        weddingId: entry.weddingId ?? null,
        targetId: entry.targetId ?? null,
        ip: entry.ip ?? "",
        userAgent: (entry.userAgent ?? "").slice(0, 300),
      },
    });
  } catch (err) {
    console.error("[audit] No se pudo registrar el evento", entry.action, err);
  }
}
