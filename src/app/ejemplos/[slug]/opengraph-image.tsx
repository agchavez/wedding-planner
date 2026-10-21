import { CARD_CONTENT_TYPE, CARD_SIZE, renderInvitationCard } from "@/lib/invitationCard";
import { findInvitationExample } from "@/lib/invitationExamples";
import { formatEventDay } from "@/lib/eventTime";

export const alt = "Invitación de boda de ejemplo";
export const size = CARD_SIZE;
export const contentType = CARD_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const example = findInvitationExample((await params).slug);
  const d = example?.data;
  return renderInvitationCard({
    theme: d?.theme ?? "classic",
    partner1: d?.partner1 ?? "",
    partner2: d?.partner2 ?? "",
    guestName: example?.guest.fullName ?? null,
    dayLabel: d?.ceremonyTime ? formatEventDay(d.ceremonyTime) : "",
    place: d?.ceremonyPlace ?? "",
    coverImageUrl: d?.coverImageUrl ?? "",
  });
}
