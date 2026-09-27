import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { clientIp, recordAudit, type AuditCategory } from "@/lib/audit-log";

/**
 * Registra una acción hecha desde una server action: completa actor, IP y navegador a
 * partir del request actual. Con `dedupeMinutes`, omite el evento si el mismo usuario
 * ya registró esa acción sobre el mismo objeto en ese intervalo (p. ej. autoguardado).
 */
export async function audit(
  action: string,
  summary: string,
  opts: { category?: AuditCategory; weddingId?: string | null; targetId?: string | null; dedupeMinutes?: number } = {}
) {
  const [session, h] = await Promise.all([getSession(), headers()]);
  const actor = session ? { id: session.user.id, name: session.user.name, email: session.user.email } : null;

  if (opts.dedupeMinutes && actor) {
    const recent = await prisma.auditLog.count({
      where: {
        action,
        actorId: actor.id,
        targetId: opts.targetId ?? null,
        createdAt: { gte: new Date(Date.now() - opts.dedupeMinutes * 60_000) },
      },
    });
    if (recent) return;
  }

  await recordAudit({
    action,
    category: opts.category ?? "data",
    summary,
    actor,
    weddingId: opts.weddingId,
    targetId: opts.targetId,
    ip: clientIp(h),
    userAgent: h.get("user-agent"),
  });
}
