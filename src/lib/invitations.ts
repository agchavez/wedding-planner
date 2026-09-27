import "server-only";
import { ObjectId } from "mongodb";
import { mongoDb } from "@/lib/mongo";
import { prisma } from "@/lib/prisma";
import { idString } from "@/lib/ids";
import { parseWeddingRole, type WeddingRole } from "@/lib/permissions";
import { weddingDisplayName } from "@/lib/wedding";

export type InvitationView = {
  id: string;
  email: string;
  role: WeddingRole;
  weddingId: string;
  weddingName: string;
  inviterName: string;
  status: "pending" | "accepted" | "rejected" | "canceled" | "expired";
};

export async function getInvitation(id: string): Promise<InvitationView | null> {
  if (!ObjectId.isValid(id)) return null;
  const inv = await mongoDb.collection("invitation").findOne({ _id: new ObjectId(id) });
  if (!inv) return null;

  const weddingId = idString(inv.organizationId);
  const [wedding, inviter] = await Promise.all([
    prisma.wedding.findUnique({ where: { id: weddingId } }),
    ObjectId.isValid(idString(inv.inviterId))
      ? mongoDb.collection("user").findOne({ _id: new ObjectId(idString(inv.inviterId)) })
      : null,
  ]);
  const expired = inv.status === "pending" && new Date(inv.expiresAt) < new Date();

  return {
    id,
    email: String(inv.email).toLowerCase(),
    role: parseWeddingRole(inv.role),
    weddingId,
    weddingName: wedding ? weddingDisplayName(wedding, "") : "",
    inviterName: inviter?.name ?? "Alguien",
    status: expired ? "expired" : inv.status,
  };
}
