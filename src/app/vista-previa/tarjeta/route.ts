import { renderInvitationCard } from "@/lib/invitationCard";
import { formatEventDay } from "@/lib/eventTime";
import { loadDraftInvitation, sampleGuest } from "@/app/vista-previa/draft";

export const dynamic = "force-dynamic";

/** Tarjeta de WhatsApp con el borrador (la publicada está en /i/<token>/opengraph-image). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { wedding, data } = await loadDraftInvitation();
  const response = await renderInvitationCard({
    theme: data.theme,
    partner1: wedding.partner1,
    partner2: wedding.partner2,
    guestName: sampleGuest(searchParams.get("nombre"), 1).name,
    dayLabel: data.ceremonyTime
      ? formatEventDay(data.ceremonyTime)
      : wedding.weddingDate
        ? formatEventDay(wedding.weddingDate, { utc: true })
        : "",
    place: data.ceremonyPlace || wedding.venueName,
    coverImageUrl: data.coverImageUrl,
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
