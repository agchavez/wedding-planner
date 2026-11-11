"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";
import { getInvitationSettings, invitationDesigns, NOT_SENT_FILTER, toInvitationData } from "@/lib/guestInvitations";
import { findInvitationExample } from "@/lib/invitationExamples";
import { patchDesign, projectDesign, sanitizeDesign } from "@/lib/invitationBlocks";
import { detectSongKind, SONG_MAX_BYTES, songTitleFromFileName, songUrl } from "@/lib/songFiles";
import { saveUploadedFile } from "@/lib/uploads";

const text = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);

function revalidateInvitations() {
  revalidatePath("/invitaciones");
  revalidatePath("/invitados");
}

async function loadDesigns(weddingId: string) {
  const [wedding, settings] = await Promise.all([
    prisma.wedding.findUniqueOrThrow({ where: { id: weddingId } }),
    getInvitationSettings(weddingId),
  ]);
  return invitationDesigns(settings, toInvitationData(wedding, settings));
}

/**
 * Sube la canción de la invitación (mp3 o m4a) y devuelve su enlace público. No cambia el
 * diseño: el editor pone el enlace en el borrador y se publica como cualquier otro cambio.
 */
export async function uploadInvitationSong(formData: FormData): Promise<{ ok: true; url: string; title: string } | { ok: false; error: string }> {
  const weddingId = await getEditableWeddingId();
  const file = formData.get("song");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Elige un archivo de audio." };
  if (file.size > SONG_MAX_BYTES) return { ok: false, error: `La canción supera el límite de ${SONG_MAX_BYTES / 1024 / 1024} MB.` };

  // El tipo sale del contenido, no del nombre: el archivo se sirve públicamente como audio.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectSongKind(bytes);
  if (!kind) return { ok: false, error: "El archivo no es un mp3 o m4a válido." };

  const base = (file.name || "cancion").replace(/\.[a-z0-9]{2,4}$/i, "").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "cancion";
  const saved = await saveUploadedFile(new File([bytes], `${base}.${kind}`), `songs/${weddingId}`, SONG_MAX_BYTES);
  if (!saved) return { ok: false, error: "No se pudo guardar la canción." };

  await audit("invitation.song_upload", "Subió la canción de la invitación", { weddingId });
  return { ok: true, url: songUrl(weddingId, saved.url.split("/").pop() ?? ""), title: songTitleFromFileName(file.name || "") };
}

/** Autoguardado del editor: solo el borrador, los invitados siguen viendo lo publicado. */
export async function saveInvitationDraft(input: unknown): Promise<{ ok: true; savedAt: string } | { ok: false; error: string }> {
  const weddingId = await getEditableWeddingId();
  const design = sanitizeDesign(input, { trim: false });
  if (!design) return { ok: false, error: "El diseño no es válido." };
  await getInvitationSettings(weddingId);
  const saved = await prisma.invitationSettings.update({ where: { id: weddingId }, data: { draftDesign: design } });
  await audit("invitation.draft_update", "Editó el borrador de la invitación", { weddingId, dedupeMinutes: 30 });
  return { ok: true, savedAt: saved.updatedAt.toISOString() };
}

/**
 * Publica el diseño: pasa a ser lo que ven los invitados y se proyecta a los campos de
 * siempre (tarjeta de WhatsApp, calendario, MCP). Ver lib/invitationBlocks.ts.
 */
export async function publishInvitation(input: unknown): Promise<{ ok: true; publishedAt: string } | { ok: false; error: string }> {
  const weddingId = await getEditableWeddingId();
  const design = sanitizeDesign(input);
  if (!design) return { ok: false, error: "El diseño no es válido." };
  await getInvitationSettings(weddingId);
  const f = projectDesign(design);
  const toDate = (iso: string | null) => (iso ? new Date(iso) : null);
  const publishedAt = new Date();
  await prisma.invitationSettings.update({
    where: { id: weddingId },
    data: {
      draftDesign: design,
      publishedDesign: design,
      publishedAt,
      ...f,
      ceremonyTime: toDate(f.ceremonyTime),
      receptionTime: toDate(f.receptionTime),
      rsvpDeadline: toDate(f.rsvpDeadline),
    },
  });
  await audit("invitation.publish", "Publicó la invitación", { weddingId, dedupeMinutes: 10 });
  revalidateInvitations();
  return { ok: true, publishedAt: publishedAt.toISOString() };
}

/** Descarta el borrador: vuelve a lo publicado. */
export async function discardInvitationDraft() {
  const weddingId = await getEditableWeddingId();
  const { published } = await loadDesigns(weddingId);
  await prisma.invitationSettings.update({ where: { id: weddingId }, data: { draftDesign: published } });
  revalidateInvitations();
  return published;
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
 * Copia los textos y las fotos de una invitación de ejemplo al borrador, para partir de ahí y
 * modificarla (se ve al publicar). No toca fechas, horas, lugares, familia ni datos bancarios:
 * esos son de cada boda.
 */
export async function applyInvitationExample(slug: string) {
  const weddingId = await getEditableWeddingId();
  const example = findInvitationExample(slug);
  if (!example) return { error: "Ese ejemplo no existe." };
  const { draft } = await loadDesigns(weddingId);
  const d = example.data;
  const next = patchDesign(draft, {
    coverImageUrl: d.coverImageUrl,
    headline: d.headline,
    message: d.message,
    quote: d.quote,
    dressCode: d.dressCode,
    dressCodeNote: d.dressCodeNote,
    dressCodeColors: d.dressCodeColors,
    giftsNote: d.giftsNote,
    showCountdown: d.showCountdown,
    itinerary: d.itinerary,
    galleryUrls: d.galleryUrls,
    adultsOnly: d.adultsOnly,
    recommendations: d.recommendations,
    closingMessage: d.closingMessage,
  });
  await prisma.invitationSettings.update({ where: { id: weddingId }, data: { draftDesign: next } });
  await audit("invitation.apply_example", `Aplicó el ejemplo de invitación "${example.title}" al borrador`, { weddingId });
  revalidateInvitations();
  return { design: next };
}
