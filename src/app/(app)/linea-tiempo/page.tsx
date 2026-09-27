import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { EventTabsClient } from "@/app/(app)/linea-tiempo/EventTabsClient";
import type { TimelineEvent } from "@/generated/prisma";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function LineaTiempoPage() {
  const weddingId = await getActiveWeddingId();
  const [events, items] = await Promise.all([
    prisma.weddingEvent.findMany({ where: { weddingId }, orderBy: { sortOrder: "asc" } }),
    prisma.timelineEvent.findMany({ where: { weddingId }, orderBy: { sortOrder: "asc" } }),
  ]);

  const itemsByEvent: Record<string, TimelineEvent[]> = {};
  for (const item of items) {
    if (!item.eventId) continue;
    (itemsByEvent[item.eventId] ??= []).push(item);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Línea de tiempo" description={"Cómo va a transcurrir cada evento de la boda. Crea un evento por cada celebración (ej. Boda Jardín, Boda Fiesta) y exporta su línea de tiempo en PDF."} />
      <EventTabsClient events={events} itemsByEvent={itemsByEvent} />
    </div>
  );
}
