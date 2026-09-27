"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { weddingDisplayName } from "@/lib/wedding";

function slugify(text: string) {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "boda"
  );
}

export async function createWeddingAction(formData: FormData): Promise<{ error?: string }> {
  const session = await requireSession();
  const partner1 = String(formData.get("partner1") ?? "").trim();
  const partner2 = String(formData.get("partner2") ?? "").trim();
  const dateRaw = String(formData.get("weddingDate") ?? "");
  const name = weddingDisplayName({ partner1, partner2 }, `Boda de ${session.user.name}`);

  let weddingId: string;
  try {
    const org = await auth.api.createOrganization({
      headers: await headers(),
      body: { name, slug: `${slugify(name)}-${randomBytes(3).toString("hex")}` },
    });
    if (!org) throw new Error("No se pudo crear la boda.");
    weddingId = org.id;
  } catch (err) {
    return { error: err instanceof APIError ? (err.body?.message ?? err.message) : "No se pudo crear la boda." };
  }

  await prisma.wedding.upsert({
    where: { id: weddingId },
    update: {},
    create: { id: weddingId, partner1, partner2, weddingDate: dateRaw ? new Date(dateRaw) : null },
  });
  await audit("wedding.create", `Creó la boda ${name}`, { weddingId, targetId: weddingId });
  redirect("/");
}

export async function acceptInvitationAction(invitationId: string): Promise<{ error?: string }> {
  await requireSession();
  try {
    const result = await auth.api.acceptInvitation({ headers: await headers(), body: { invitationId } });
    const weddingId = result?.invitation.organizationId ?? null;
    await audit("member.join", "Aceptó la invitación y se unió a la boda", { weddingId, targetId: invitationId });
  } catch (err) {
    return { error: err instanceof APIError ? (err.body?.message ?? err.message) : "No se pudo aceptar la invitación." };
  }
  redirect("/");
}
