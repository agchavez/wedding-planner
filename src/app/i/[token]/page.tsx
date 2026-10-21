import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { weddingDisplayName } from "@/lib/wedding";
import { formatEventDay } from "@/lib/eventTime";
import { firstName } from "@/lib/invitationMessage";
import { findInvitationByToken, toInvitationData, toInvitationGuestData } from "@/lib/guestInvitations";
import { InvitationExperience } from "@/components/invitation/InvitationExperience";
import { invitationFontClasses } from "@/components/invitation/fonts";
import { invitationTheme } from "@/lib/invitationThemes";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ p?: string }> };

/** Robots de vista previa (WhatsApp, Facebook, Telegram…): no cuentan como "vista". */
const PREVIEW_BOT = /whatsapp|facebookexternalhit|facebot|telegrambot|twitterbot|slackbot|discordbot|linkedinbot|skypeuripreview|googlebot|bingbot|applebot|bot\b|crawler|spider|preview/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const found = await findInvitationByToken(token);
  if (!found) return { title: "Invitación" };
  const { guest, wedding, settings } = found;

  const couple = weddingDisplayName(wedding, "nuestra boda");
  const day = settings.ceremonyTime
    ? formatEventDay(settings.ceremonyTime)
    : wedding.weddingDate
      ? formatEventDay(wedding.weddingDate, { utc: true })
      : "";
  const place = settings.ceremonyPlace || wedding.venueName;
  const title = `${firstName(guest.fullName)}, te invitamos a la boda de ${couple}`;
  const description = [day && day[0].toUpperCase() + day.slice(1), place].filter(Boolean).join(" · ") +
    ". Abre tu invitación y confirma tu asistencia 💌";

  return {
    title: `Boda de ${couple}`,
    description,
    // Que no se indexe: cada enlace es personal.
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName: couple,
      locale: "es_HN",
      title,
      description,
      url: `/i/${token}`,
    },
    twitter: { card: "summary_large_image", title, description },
    other: { "theme-color": invitationTheme(settings.theme).background },
  };
}

export default async function InvitationPage({ params, searchParams }: Props) {
  const [{ token }, { p }] = await Promise.all([params, searchParams]);
  const found = await findInvitationByToken(token);
  if (!found) notFound();
  const { guest, wedding, settings } = found;

  // Aperturas reales del invitado (no la vista previa de la pareja ni los robots de enlaces).
  const ua = (await headers()).get("user-agent") ?? "";
  if (p !== "1" && !PREVIEW_BOT.test(ua)) {
    await prisma.guest.update({
      where: { id: guest.id },
      data: { invitationViews: { increment: 1 }, invitationOpenedAt: guest.invitationOpenedAt ?? new Date() },
    });
  }

  return (
    <main className={invitationFontClasses}>
      <InvitationExperience
        data={toInvitationData(wedding, settings)}
        guest={toInvitationGuestData(guest)}
        token={token}
      />
    </main>
  );
}
