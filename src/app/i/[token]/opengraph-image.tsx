import { findInvitationByToken } from "@/lib/guestInvitations";
import { CARD_CONTENT_TYPE, CARD_SIZE, renderInvitationCard } from "@/lib/invitationCard";
import { formatEventDay } from "@/lib/eventTime";

/** Tarjeta de vista previa (WhatsApp, etc.) personalizada con el nombre del invitado. */

export const alt = "Invitación de boda";
export const size = CARD_SIZE;
export const contentType = CARD_CONTENT_TYPE;
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await findInvitationByToken(token);
  const wedding = found?.wedding;
  const settings = found?.settings;
  return renderInvitationCard({
    theme: settings?.theme ?? "classic",
    partner1: wedding?.partner1 ?? "",
    partner2: wedding?.partner2 ?? "",
    guestName: found?.guest.fullName ?? null,
    dayLabel: settings?.ceremonyTime
      ? formatEventDay(settings.ceremonyTime)
      : wedding?.weddingDate
        ? formatEventDay(wedding.weddingDate, { utc: true })
        : "",
    place: settings?.ceremonyPlace || wedding?.venueName || "",
    coverImageUrl: settings?.coverImageUrl ?? "",
  });
}
