"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { clientIp, recordAudit } from "@/lib/audit-log";
import { findInvitationByToken } from "@/lib/guestInvitations";

export type RsvpResult = { ok: true } | { ok: false; error: string };

/** Respuesta del invitado desde su enlace personal (sin sesión: el token es la credencial). */
export async function respondInvitation(
  token: string,
  input: { attending: boolean; count: number; dietary: string; message: string }
): Promise<RsvpResult> {
  const found = await findInvitationByToken(token);
  if (!found) return { ok: false, error: "Esta invitación ya no es válida." };
  const { guest } = found;

  const seats = 1 + Math.max(0, guest.plusOnes);
  const count = input.attending ? Math.min(seats, Math.max(1, Math.round(Number(input.count) || 1))) : 0;
  const updated = await prisma.guest.update({
    where: { id: guest.id },
    data: {
      rsvpStatus: input.attending ? "confirmed" : "declined",
      attendingCount: count,
      dietaryRestrictions: String(input.dietary ?? "").slice(0, 300),
      rsvpMessage: String(input.message ?? "").slice(0, 1000),
      rsvpRespondedAt: new Date(),
      invitationOpenedAt: guest.invitationOpenedAt ?? new Date(),
    },
  });

  const h = await headers();
  await recordAudit({
    action: "guest.rsvp",
    category: "data",
    summary: input.attending
      ? `${updated.fullName} confirmó su asistencia (${count} ${count === 1 ? "persona" : "personas"}) desde su invitación`
      : `${updated.fullName} respondió que no podrá asistir`,
    actor: null,
    weddingId: guest.weddingId,
    targetId: guest.id,
    ip: clientIp(h),
    userAgent: h.get("user-agent") ?? "",
  });

  revalidatePath("/invitados");
  revalidatePath("/invitaciones");
  revalidatePath("/");
  return { ok: true };
}
