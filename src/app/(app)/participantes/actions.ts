"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { roleLabel, WEDDING_ROLES, type WeddingRole } from "@/lib/permissions";
import { requireWeddingContext } from "@/lib/wedding";

export type ActionResult = { error?: string; link?: string };

function message(err: unknown, fallback: string) {
  if (err instanceof APIError) return err.body?.message ?? err.message;
  return err instanceof Error ? err.message : fallback;
}

/** Solo la pareja y los organizadores gestionan participantes; solo la pareja nombra pareja. */
async function requireManager(role?: string) {
  const ctx = await requireWeddingContext();
  if (!ctx.canManage) throw new Error("Solo la pareja o un organizador pueden gestionar participantes.");
  if (role === "owner" && ctx.role !== "owner") throw new Error("Solo la pareja puede dar el rol de pareja.");
  if (role && !WEDDING_ROLES.some((r) => r.value === role)) throw new Error("Rol no válido.");
  return ctx;
}

export async function inviteParticipantAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "member") as WeddingRole;
  try {
    const ctx = await requireManager(role);
    const invitation = await auth.api.createInvitation({
      headers: await headers(),
      body: { email, role, organizationId: ctx.weddingId, resend: true },
    });
    await audit("member.invite", `Invitó a ${email} como ${roleLabel(role).toLowerCase()}`, {
      weddingId: ctx.weddingId,
      targetId: invitation.id,
    });
    revalidatePath("/participantes");
    const base = process.env.BETTER_AUTH_URL ?? "";
    return { link: `${base}/invitacion/${invitation.id}` };
  } catch (err) {
    return { error: message(err, "No se pudo crear la invitación.") };
  }
}

export async function cancelInvitationAction(invitationId: string, email: string): Promise<ActionResult> {
  try {
    const ctx = await requireManager();
    await auth.api.cancelInvitation({ headers: await headers(), body: { invitationId } });
    await audit("member.invite_cancel", `Canceló la invitación de ${email}`, { weddingId: ctx.weddingId, targetId: invitationId });
    revalidatePath("/participantes");
    return {};
  } catch (err) {
    return { error: message(err, "No se pudo cancelar la invitación.") };
  }
}

export async function updateParticipantRoleAction(memberId: string, name: string, role: string): Promise<ActionResult> {
  try {
    const ctx = await requireManager(role);
    await auth.api.updateMemberRole({
      headers: await headers(),
      body: { memberId, role: role as WeddingRole, organizationId: ctx.weddingId },
    });
    await audit("member.role_change", `Cambió el rol de ${name} a ${roleLabel(role).toLowerCase()}`, {
      weddingId: ctx.weddingId,
      targetId: memberId,
    });
    revalidatePath("/participantes");
    return {};
  } catch (err) {
    return { error: message(err, "No se pudo cambiar el rol.") };
  }
}

export async function removeParticipantAction(memberId: string, name: string): Promise<ActionResult> {
  try {
    const ctx = await requireManager();
    await auth.api.removeMember({ headers: await headers(), body: { memberIdOrEmail: memberId, organizationId: ctx.weddingId } });
    await audit("member.remove", `Quitó a ${name} de la boda`, { weddingId: ctx.weddingId, targetId: memberId });
    revalidatePath("/participantes");
    return {};
  } catch (err) {
    return { error: message(err, "No se pudo quitar al participante.") };
  }
}

export async function leaveWeddingAction(): Promise<ActionResult> {
  const ctx = await requireWeddingContext();
  try {
    await auth.api.leaveOrganization({ headers: await headers(), body: { organizationId: ctx.weddingId } });
    await audit("member.leave", "Salió de la boda", { weddingId: ctx.weddingId, targetId: ctx.weddingId });
  } catch (err) {
    return { error: message(err, "No se pudo salir de la boda.") };
  }
  redirect("/");
}
