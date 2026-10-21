import "server-only";
import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { weddingDisplayName } from "@/lib/wedding";
import {
  formatWeddingDate,
  invitationUrl,
  isValidWhatsappPhone,
  normalizePhone,
  renderInvitationMessage,
  whatsappUrl,
} from "@/lib/invitationMessage";
import type { Guest, InvitationSettings, Wedding } from "@/generated/prisma";

/** Datos de la invitación ya serializables, tal como los recibe la vista (cliente). */
export type InvitationData = {
  partner1: string;
  partner2: string;
  weddingDate: string | null;
  venueName: string;
  venueAddress: string;
  theme: string;
  headline: string;
  message: string;
  quote: string;
  coverImageUrl: string;
  ceremonyTime: string | null;
  ceremonyPlace: string;
  ceremonyAddress: string;
  ceremonyMapUrl: string;
  receptionTime: string | null;
  receptionPlace: string;
  receptionAddress: string;
  receptionMapUrl: string;
  dressCode: string;
  dressCodeNote: string;
  giftsNote: string;
  hashtag: string;
  rsvpDeadline: string | null;
  showCountdown: boolean;
};

export type InvitationGuestData = {
  fullName: string;
  seats: number;
  plusOneNames: string[];
  rsvpStatus: string;
  attendingCount: number | null;
  rsvpMessage: string;
  dietaryRestrictions: string;
  responded: boolean;
};

/**
 * Filtro "todavía sin enviar". En Mongo, `campo: null` de Prisma no incluye documentos donde
 * el campo no existe (invitados creados antes de que existiera la invitación digital).
 */
export const NOT_SENT_FILTER = { OR: [{ invitationSentAt: null }, { invitationSentAt: { isSet: false } }] };

/** Origen público de la app (para enlaces que salen de ella: WhatsApp, MCP). */
export async function publicOrigin(): Promise<string> {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function getInvitationSettings(weddingId: string) {
  return prisma.invitationSettings.upsert({ where: { id: weddingId }, update: {}, create: { id: weddingId } });
}

function newToken() {
  // 12 caracteres url-safe (72 bits): corto para WhatsApp e imposible de adivinar.
  return randomBytes(9).toString("base64url");
}

/** Token del enlace personal del invitado; lo crea si todavía no tiene. */
export async function ensureInvitationToken(guest: Pick<Guest, "id" | "invitationToken">): Promise<string> {
  if (guest.invitationToken) return guest.invitationToken;
  const token = newToken();
  await prisma.guest.update({ where: { id: guest.id }, data: { invitationToken: token } });
  return token;
}

/** Genera de una vez los tokens que falten en una lista de invitados (los modifica en sitio). */
export async function ensureInvitationTokens<T extends Pick<Guest, "id" | "invitationToken">>(guests: T[]) {
  const missing = guests.filter((g) => !g.invitationToken);
  await Promise.all(
    missing.map(async (g) => {
      g.invitationToken = await ensureInvitationToken(g);
    })
  );
  return guests;
}

export function toInvitationData(wedding: Wedding, s: InvitationSettings): InvitationData {
  const iso = (d: Date | null) => d?.toISOString() ?? null;
  return {
    partner1: wedding.partner1,
    partner2: wedding.partner2,
    weddingDate: iso(wedding.weddingDate),
    venueName: wedding.venueName,
    venueAddress: wedding.venueAddress,
    theme: s.theme,
    headline: s.headline,
    message: s.message,
    quote: s.quote,
    coverImageUrl: s.coverImageUrl,
    ceremonyTime: iso(s.ceremonyTime),
    ceremonyPlace: s.ceremonyPlace,
    ceremonyAddress: s.ceremonyAddress,
    ceremonyMapUrl: s.ceremonyMapUrl,
    receptionTime: iso(s.receptionTime),
    receptionPlace: s.receptionPlace,
    receptionAddress: s.receptionAddress,
    receptionMapUrl: s.receptionMapUrl,
    dressCode: s.dressCode,
    dressCodeNote: s.dressCodeNote,
    giftsNote: s.giftsNote,
    hashtag: s.hashtag,
    rsvpDeadline: iso(s.rsvpDeadline),
    showCountdown: s.showCountdown,
  };
}

export function toInvitationGuestData(guest: Guest): InvitationGuestData {
  return {
    fullName: guest.fullName,
    seats: 1 + Math.max(0, guest.plusOnes),
    plusOneNames: guest.plusOneNames,
    rsvpStatus: guest.rsvpStatus,
    attendingCount: guest.attendingCount,
    rsvpMessage: guest.rsvpMessage,
    dietaryRestrictions: guest.dietaryRestrictions,
    responded: Boolean(guest.rsvpRespondedAt),
  };
}

/** Invitado, boda y diseño a partir del token del enlace público. */
export async function findInvitationByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(token)) return null;
  const guest = await prisma.guest.findFirst({ where: { invitationToken: token } });
  if (!guest?.weddingId) return null;
  const [wedding, settings] = await Promise.all([
    prisma.wedding.findUnique({ where: { id: guest.weddingId } }),
    getInvitationSettings(guest.weddingId),
  ]);
  if (!wedding) return null;
  return { guest, wedding, settings };
}

export type GuestInvitationLinks = {
  guestId: string;
  fullName: string;
  url: string;
  message: string;
  phone: string;
  whatsappUrl: string;
  hasValidPhone: boolean;
};

/** Enlace, mensaje y enlace de WhatsApp de cada invitado (genera los tokens que falten). */
export async function buildInvitationLinks(
  guests: Guest[],
  wedding: Wedding,
  settings: InvitationSettings,
  origin?: string
): Promise<GuestInvitationLinks[]> {
  const base = origin ?? (await publicOrigin());
  await ensureInvitationTokens(guests);
  const coupleNames = weddingDisplayName(wedding, "Los novios");
  const dateLabel = formatWeddingDate(wedding.weddingDate);
  return guests.map((guest) => {
    const url = invitationUrl(base, guest.invitationToken!);
    const message = renderInvitationMessage(settings.whatsappTemplate, {
      fullName: guest.fullName,
      coupleNames,
      dateLabel,
      link: url,
      seats: 1 + guest.plusOnes,
    });
    const phone = normalizePhone(guest.phone, settings.defaultCountryCode);
    return {
      guestId: guest.id,
      fullName: guest.fullName,
      url,
      message,
      phone,
      whatsappUrl: whatsappUrl(isValidWhatsappPhone(phone) ? phone : "", message),
      hasValidPhone: isValidWhatsappPhone(phone),
    };
  });
}
