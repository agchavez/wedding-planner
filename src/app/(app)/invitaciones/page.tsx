import { prisma } from "@/lib/prisma";
import { requireWeddingContext, weddingDisplayName } from "@/lib/wedding";
import {
  ensureInvitationTokens,
  getInvitationSettings,
  publicOrigin,
  toInvitationData,
} from "@/lib/guestInvitations";
import { formatWeddingDate, invitationUrl } from "@/lib/invitationMessage";
import { toEventDateTimeValue } from "@/lib/eventTime";
import { invitationFontClasses } from "@/components/invitation/fonts";
import { InvitationsDashboard } from "@/app/(app)/invitaciones/InvitationsDashboard";
import type { InvitationRow } from "@/app/(app)/invitaciones/shared";

export const dynamic = "force-dynamic";

export default async function InvitacionesPage({ searchParams }: PageProps<"/invitaciones">) {
  const { tab, ejemplo } = await searchParams;
  const { weddingId, canEdit } = await requireWeddingContext();
  const [wedding, settings, guests, labels, groups, origin] = await Promise.all([
    prisma.wedding.findUniqueOrThrow({ where: { id: weddingId } }),
    getInvitationSettings(weddingId),
    prisma.guest.findMany({ where: { weddingId }, orderBy: { fullName: "asc" } }),
    prisma.guestLabel.findMany({ where: { weddingId }, orderBy: { name: "asc" } }),
    prisma.guestGroup.findMany({ where: { weddingId }, select: { name: true } }),
    publicOrigin(),
  ]);
  // Cada invitado necesita su enlace personal (solo quien puede editar lo genera).
  if (canEdit) await ensureInvitationTokens(guests);

  const rows: InvitationRow[] = guests.map((g) => ({
    id: g.id,
    fullName: g.fullName,
    side: g.side,
    labelIds: g.labelIds,
    phone: g.phone,
    plusOnes: g.plusOnes,
    rsvpStatus: g.rsvpStatus,
    attendingCount: g.attendingCount,
    rsvpMessage: g.rsvpMessage,
    rsvpRespondedAt: g.rsvpRespondedAt?.toISOString() ?? null,
    invitationSentAt: g.invitationSentAt?.toISOString() ?? null,
    invitationOpenedAt: g.invitationOpenedAt?.toISOString() ?? null,
    invitationViews: g.invitationViews,
    token: g.invitationToken,
    url: g.invitationToken ? invitationUrl(origin, g.invitationToken) : "",
  }));

  const data = toInvitationData(wedding, settings);

  return (
    <div className={invitationFontClasses}>
      <InvitationsDashboard
        rows={rows}
        guests={guests}
        groupSuggestions={[...new Set([...groups.map((g) => g.name), ...guests.map((g) => g.group)].filter(Boolean))].sort()}
        labels={labels.map((l) => ({ id: l.id, name: l.name, color: l.color }))}
        data={data}
        editor={{
          ...data,
          ceremonyTime: toEventDateTimeValue(settings.ceremonyTime),
          receptionTime: toEventDateTimeValue(settings.receptionTime),
          rsvpDeadline: settings.rsvpDeadline?.toISOString().slice(0, 10) ?? "",
        }}
        messageSettings={{ template: settings.whatsappTemplate, defaultCountryCode: settings.defaultCountryCode }}
        coupleNames={weddingDisplayName(wedding, "Los novios")}
        dateLabel={formatWeddingDate(wedding.weddingDate)}
        hasWeddingDate={Boolean(wedding.weddingDate)}
        initialTab={tab === "diseno" || tab === "mensaje" ? tab : "enviar"}
        highlightExample={typeof ejemplo === "string" ? ejemplo : undefined}
      />
    </div>
  );
}
