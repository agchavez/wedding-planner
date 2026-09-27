import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { mongoDb } from "@/lib/mongo";
import { idMatch, idString } from "@/lib/ids";
import { requireSession } from "@/lib/session";
import { canEditWedding, canManageMembers, parseWeddingRole, type WeddingRole } from "@/lib/permissions";

export type WeddingContext = {
  weddingId: string;
  role: WeddingRole;
  canEdit: boolean;
  canManage: boolean;
};

/**
 * Boda activa del usuario y su rol en ella. Cada boda es una organización de Better
 * Auth; la activa se guarda en la sesión (`activeOrganizationId`). Si la sesión apunta
 * a una boda de la que el usuario ya no forma parte, se cae a la primera que tenga.
 * Devuelve null si el usuario no participa en ninguna boda.
 */
export const getWeddingContext = cache(async (): Promise<WeddingContext | null> => {
  const session = await requireSession();
  const members = mongoDb.collection("member");
  const userId = session.user.id;
  const activeId = session.session.activeOrganizationId;

  let member = activeId ? await members.findOne({ userId: idMatch(userId), organizationId: idMatch(activeId) }) : null;
  if (!member) {
    member = await members.findOne({ userId: idMatch(userId) }, { sort: { createdAt: 1 } });
    if (!member) return null;
    await mongoDb
      .collection("session")
      .updateOne({ token: session.session.token }, { $set: { activeOrganizationId: idString(member.organizationId) } });
  }

  const weddingId = idString(member.organizationId);
  // Toda organización tiene su documento Wedding con el mismo id.
  await prisma.wedding.upsert({ where: { id: weddingId }, update: {}, create: { id: weddingId } });

  const role = parseWeddingRole(member.role);
  return { weddingId, role, canEdit: canEditWedding(role), canManage: canManageMembers(role) };
});

/** Para lecturas: sin boda, el usuario va a crear una (o el admin a su consola). */
export async function requireWeddingContext(): Promise<WeddingContext> {
  const ctx = await getWeddingContext();
  if (!ctx) {
    const { user } = await requireSession();
    redirect(user.role === "admin" ? "/admin" : "/bienvenida");
  }
  return ctx;
}

export async function getActiveWeddingId(): Promise<string> {
  return (await requireWeddingContext()).weddingId;
}

/** Para mutaciones: exige un rol con permiso de edición en la boda activa. */
export async function getEditableWeddingId(): Promise<string> {
  const ctx = await requireWeddingContext();
  if (!ctx.canEdit) throw new Error("Tu rol en esta boda es de solo lectura.");
  return ctx.weddingId;
}

export async function getActiveWedding() {
  const id = await getActiveWeddingId();
  return prisma.wedding.findUniqueOrThrow({ where: { id } });
}

export function weddingDisplayName(w: { partner1: string; partner2: string }, fallback = "Boda sin nombre") {
  return [w.partner1, w.partner2].filter(Boolean).join(" & ") || fallback;
}

export type WeddingSummary = { id: string; name: string; role: WeddingRole; weddingDate: string | null };

/** Bodas en las que participa el usuario, con su rol en cada una. */
export async function listUserWeddings(userId: string): Promise<WeddingSummary[]> {
  const memberships = await mongoDb
    .collection("member")
    .find({ userId: idMatch(userId) })
    .sort({ createdAt: 1 })
    .toArray();
  const ids = memberships.map((m) => idString(m.organizationId));
  const weddings = await prisma.wedding.findMany({ where: { id: { in: ids } } });
  const byId = new Map(weddings.map((w) => [w.id, w]));
  return memberships.map((m) => {
    const id = idString(m.organizationId);
    const w = byId.get(id);
    return {
      id,
      name: w ? weddingDisplayName(w) : "Boda sin nombre",
      role: parseWeddingRole(m.role),
      weddingDate: w?.weddingDate?.toISOString() ?? null,
    };
  });
}

/** Invitaciones pendientes y vigentes para un correo. */
export async function listPendingInvitations(email: string) {
  const invitations = await mongoDb
    .collection("invitation")
    .find({ email: email.toLowerCase(), status: "pending", expiresAt: { $gt: new Date() } })
    .sort({ createdAt: -1 })
    .toArray();
  const weddings = await prisma.wedding.findMany({
    where: { id: { in: invitations.map((i) => idString(i.organizationId)) } },
  });
  const byId = new Map(weddings.map((w) => [w.id, w]));
  return invitations.map((i) => {
    const w = byId.get(idString(i.organizationId));
    return {
      id: idString(i._id),
      weddingName: w ? weddingDisplayName(w) : "una boda",
      role: parseWeddingRole(i.role),
    };
  });
}
