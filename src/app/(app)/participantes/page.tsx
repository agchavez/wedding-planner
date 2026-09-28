import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { requireWeddingContext } from "@/lib/wedding";
import { parseWeddingRole } from "@/lib/permissions";
import { ParticipantsManager, type Participant, type PendingInvite } from "@/app/(app)/participantes/ParticipantsManager";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = { title: "Participantes · Wedplan" };
export const dynamic = "force-dynamic";

export default async function ParticipantesPage() {
  const ctx = await requireWeddingContext();
  const session = await getSession();
  const org = await auth.api.getFullOrganization({
    headers: await headers(),
    query: { organizationId: ctx.weddingId, membersLimit: 200 },
  });

  const participants: Participant[] = (org?.members ?? []).map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    role: parseWeddingRole(m.role),
    joinedAt: new Date(m.createdAt).toISOString(),
  }));
  const base = process.env.BETTER_AUTH_URL ?? "";
  const invites: PendingInvite[] = (org?.invitations ?? [])
    .filter((i) => i.status === "pending" && new Date(i.expiresAt) > new Date())
    .map((i) => ({
      id: i.id,
      email: i.email,
      role: parseWeddingRole(i.role),
      expiresAt: new Date(i.expiresAt).toISOString(),
      link: `${base}/invitacion/${i.id}`,
    }));

  return (
    <div className="space-y-6">
      <PageHeader title="Participantes" description={"Quiénes organizan esta boda contigo y qué puede hacer cada uno."} />
      <ParticipantsManager
        participants={participants}
        invites={invites}
        currentUserId={session!.user.id}
        myRole={ctx.role}
        canManage={ctx.canManage}
      />
    </div>
  );
}
