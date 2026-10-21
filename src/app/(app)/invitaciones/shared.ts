"use client";

import { toast } from "sonner";
import {
  invitationStatus,
  isValidWhatsappPhone,
  normalizePhone,
  renderInvitationMessage,
  whatsappUrl,
} from "@/lib/invitationMessage";

export type InvitationRow = {
  id: string;
  fullName: string;
  side: string;
  labelIds: string[];
  phone: string;
  plusOnes: number;
  rsvpStatus: string;
  attendingCount: number | null;
  rsvpMessage: string;
  rsvpRespondedAt: string | null;
  invitationSentAt: string | null;
  invitationOpenedAt: string | null;
  invitationViews: number;
  token: string | null;
  url: string;
};

export type MessageSettings = { template: string; defaultCountryCode: string };

export type MessageContextBase = { coupleNames: string; dateLabel: string };

/** Mensaje y enlace de WhatsApp de un invitado, con la plantilla y el código de país de la boda. */
export function rowMessage(row: InvitationRow, settings: MessageSettings, ctx: MessageContextBase) {
  const message = renderInvitationMessage(settings.template, {
    fullName: row.fullName,
    coupleNames: ctx.coupleNames,
    dateLabel: ctx.dateLabel,
    link: row.url,
    seats: 1 + row.plusOnes,
  });
  const phone = normalizePhone(row.phone, settings.defaultCountryCode);
  const validPhone = isValidWhatsappPhone(phone);
  return { message, phone, validPhone, whatsapp: whatsappUrl(validPhone ? phone : "", message) };
}

export function rowStatus(row: InvitationRow) {
  return invitationStatus(row);
}

export async function copyText(text: string, success: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(success);
  } catch {
    toast("Copia este texto", { description: text.slice(0, 300), duration: 15000 });
  }
}
