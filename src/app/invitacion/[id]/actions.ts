"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { clientIp, recordAudit } from "@/lib/audit-log";
import { getInvitation } from "@/lib/invitations";
import { mongoDb } from "@/lib/mongo";

/**
 * Alta de cuenta desde una invitación: el correo lo fija la invitación, así que solo
 * quien recibió el enlace puede usarlo, y la cuenta nace ya como miembro de la boda.
 */
export async function registerFromInvitationAction(invitationId: string, formData: FormData): Promise<{ error?: string }> {
  const invitation = await getInvitation(invitationId);
  if (!invitation || invitation.status !== "pending") return { error: "Esta invitación ya no está disponible." };

  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!name) return { error: "Escribe tu nombre." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (await mongoDb.collection("user").findOne({ email: invitation.email })) {
    return { error: "Ya existe una cuenta con este correo. Inicia sesión para aceptar la invitación." };
  }

  const h = await headers();
  try {
    const { user } = await auth.api.createUser({ body: { email: invitation.email, password, name, role: "user" } });
    await auth.api.addMember({ body: { userId: user.id, organizationId: invitation.weddingId, role: invitation.role } });
    await mongoDb.collection("invitation").updateOne({ _id: new ObjectId(invitationId) }, { $set: { status: "accepted" } });
    await recordAudit({
      action: "member.join",
      category: "data",
      summary: `Creó su cuenta y se unió a la boda ${invitation.weddingName}`,
      actor: { id: user.id, name, email: invitation.email },
      weddingId: invitation.weddingId,
      targetId: invitationId,
      ip: clientIp(h),
      userAgent: h.get("user-agent"),
    });
    await auth.api.signInEmail({ headers: h, body: { email: invitation.email, password } });
  } catch (err) {
    return { error: err instanceof APIError ? (err.body?.message ?? err.message) : "No se pudo crear tu cuenta." };
  }
  redirect("/");
}
