"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";
import { parseEventDateTime } from "@/lib/eventTime";
import { isInvitationTheme } from "@/lib/invitationThemes";
import { getInvitationSettings, NOT_SENT_FILTER } from "@/lib/guestInvitations";
import { EXAMPLE_COVER_PHOTOS, findInvitationExample } from "@/lib/invitationExamples";

export type InvitationSettingsInput = {
  theme: string;
  headline: string;
  message: string;
  quote: string;
  coverImageUrl: string;
  ceremonyTime: string;
  ceremonyPlace: string;
  ceremonyAddress: string;
  ceremonyMapUrl: string;
  receptionTime: string;
  receptionPlace: string;
  receptionAddress: string;
  receptionMapUrl: string;
  dressCode: string;
  dressCodeNote: string;
  giftsNote: string;
  hashtag: string;
  rsvpDeadline: string;
  showCountdown: boolean;
};

const text = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);

function safeUrl(value: unknown) {
  const url = text(value, 2000);
  return /^https?:\/\//i.test(url) ? url : "";
}

/** Portada: una URL http(s) o una de las fotos de ejemplo incluidas en la app. */
function safeCoverUrl(value: unknown) {
  const url = text(value, 2000);
  return EXAMPLE_COVER_PHOTOS.includes(url) ? url : safeUrl(url);
}

function revalidateInvitations() {
  revalidatePath("/invitaciones");
  revalidatePath("/invitados");
}

export async function saveInvitationDesign(input: InvitationSettingsInput) {
  const weddingId = await getEditableWeddingId();
  await getInvitationSettings(weddingId);
  const deadline = /^\d{4}-\d{2}-\d{2}$/.test(input.rsvpDeadline) ? new Date(`${input.rsvpDeadline}T00:00:00Z`) : null;

  await prisma.invitationSettings.update({
    where: { id: weddingId },
    data: {
      theme: isInvitationTheme(input.theme) ? input.theme : "classic",
      headline: text(input.headline, 80),
      message: text(input.message, 1500),
      quote: text(input.quote, 400),
      coverImageUrl: safeCoverUrl(input.coverImageUrl),
      ceremonyTime: parseEventDateTime(input.ceremonyTime),
      ceremonyPlace: text(input.ceremonyPlace, 120),
      ceremonyAddress: text(input.ceremonyAddress, 200),
      ceremonyMapUrl: safeUrl(input.ceremonyMapUrl),
      receptionTime: parseEventDateTime(input.receptionTime),
      receptionPlace: text(input.receptionPlace, 120),
      receptionAddress: text(input.receptionAddress, 200),
      receptionMapUrl: safeUrl(input.receptionMapUrl),
      dressCode: text(input.dressCode, 80),
      dressCodeNote: text(input.dressCodeNote, 200),
      giftsNote: text(input.giftsNote, 800),
      hashtag: text(input.hashtag, 60),
      rsvpDeadline: deadline,
      showCountdown: Boolean(input.showCountdown),
    },
  });
  await audit("invitation.design_update", "Actualizó el diseño de la invitación", { weddingId, dedupeMinutes: 10 });
  revalidateInvitations();
}

export async function saveWhatsappSettings(input: { template: string; defaultCountryCode: string }) {
  const weddingId = await getEditableWeddingId();
  await getInvitationSettings(weddingId);
  await prisma.invitationSettings.update({
    where: { id: weddingId },
    data: {
      whatsappTemplate: text(input.template, 2000),
      defaultCountryCode: input.defaultCountryCode.replace(/\D/g, "").slice(0, 4) || "504",
    },
  });
  await audit("invitation.message_update", "Actualizó el mensaje de WhatsApp de la invitación", { weddingId, dedupeMinutes: 10 });
  revalidateInvitations();
}

/** Marca (o desmarca) invitaciones como enviadas. */
export async function markInvitationsSent(ids: string[], sent = true) {
  const weddingId = await getEditableWeddingId();
  const where = { weddingId, id: { in: ids.slice(0, 1000) } };
  const result = await prisma.guest.updateMany({
    where: sent ? { ...where, ...NOT_SENT_FILTER } : where,
    data: { invitationSentAt: sent ? new Date() : null },
  });
  if (result.count > 0) {
    await audit(
      sent ? "invitation.sent" : "invitation.unsent",
      sent ? `Envió ${result.count} invitaciones` : `Desmarcó ${result.count} invitaciones como enviadas`,
      { weddingId, targetId: ids.length === 1 ? ids[0] : null }
    );
  }
  revalidateInvitations();
}

export async function updateGuestPhone(id: string, phone: string) {
  const weddingId = await getEditableWeddingId();
  await prisma.guest.update({ where: { id, weddingId }, data: { phone: text(phone, 30) } });
  revalidateInvitations();
}

/** Nuevo enlace para un invitado: el anterior deja de funcionar (p. ej. si se reenvió por error). */
export async function regenerateInvitationLink(id: string) {
  const weddingId = await getEditableWeddingId();
  const guest = await prisma.guest.update({
    where: { id, weddingId },
    data: { invitationToken: randomBytes(9).toString("base64url"), invitationSentAt: null },
  });
  await audit("invitation.regenerate", `Generó un enlace nuevo para "${guest.fullName}"`, { weddingId, targetId: id });
  revalidateInvitations();
}

/**
 * Copia el estilo y los textos de una invitación de ejemplo a la de la boda, para partir de
 * ahí y modificarla. No toca fechas, horas ni lugares: esos son los de cada boda.
 */
export async function applyInvitationExample(slug: string) {
  const weddingId = await getEditableWeddingId();
  const example = findInvitationExample(slug);
  if (!example) return { error: "Ese ejemplo no existe." };
  await getInvitationSettings(weddingId);
  const d = example.data;
  await prisma.invitationSettings.update({
    where: { id: weddingId },
    data: {
      theme: d.theme,
      coverImageUrl: d.coverImageUrl,
      headline: d.headline,
      message: d.message,
      quote: d.quote,
      dressCode: d.dressCode,
      dressCodeNote: d.dressCodeNote,
      giftsNote: d.giftsNote,
      showCountdown: d.showCountdown,
    },
  });
  await audit("invitation.apply_example", `Aplicó el ejemplo de invitación "${example.title}"`, { weddingId });
  revalidateInvitations();
}
