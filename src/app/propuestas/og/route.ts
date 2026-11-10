import { renderInvitationCard } from "@/lib/invitationCard";

/** Foto de la puerta (Drive, enlace directo: la tarjeta no sigue redirecciones). */
const COVER = "https://lh3.googleusercontent.com/d/18xHmFAZfKwtqLhbh82v5Jn4ohjWLbrxL=w2000";

/** Tarjeta de vista previa de /propuestas (WhatsApp) con el nombre de ?para=. */
export async function GET(request: Request) {
  const para = new URL(request.url).searchParams.get("para");
  const guestName = (para || "Indira Victoria Lopez").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 60);
  const response = await renderInvitationCard({
    theme: "olive",
    partner1: "Angel Chavez",
    partner2: "Indira Lopez",
    guestName,
    dayLabel: "sábado 12 de diciembre de 2026",
    place: "Centro de Eventos La Hacienda El Encanto de Jeto",
    coverImageUrl: COVER,
  });
  response.headers.set("Cache-Control", "public, max-age=3600");
  return response;
}
