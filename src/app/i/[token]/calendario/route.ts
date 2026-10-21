import { buildIcs } from "@/components/invitation/calendar";
import { findInvitationByToken, publicOrigin, toInvitationData } from "@/lib/guestInvitations";
import { invitationUrl } from "@/lib/invitationMessage";

/** Archivo .ics de la boda (Apple Calendar, Outlook) desde la invitación personal. */
export async function GET(_req: Request, { params }: RouteContext<"/i/[token]/calendario">) {
  const { token } = await params;
  const found = await findInvitationByToken(token);
  if (!found) return new Response("Invitación no encontrada", { status: 404 });
  const ics = buildIcs(toInvitationData(found.wedding, found.settings), invitationUrl(await publicOrigin(), token));
  if (!ics) return new Response("La boda todavía no tiene fecha", { status: 404 });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="boda.ics"',
    },
  });
}
