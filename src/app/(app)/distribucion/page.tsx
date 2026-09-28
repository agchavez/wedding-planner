import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { DistribucionEventTabsClient } from "@/app/(app)/distribucion/DistribucionEventTabsClient";
import type { Background } from "@/app/(app)/distribucion/canvasStore";
import type { RoomPoint } from "@/lib/seatGeometry";
import type { LayoutElement } from "@/generated/prisma";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function DistribucionPage() {
  const weddingId = await getActiveWeddingId();
  const [events, layouts] = await Promise.all([
    prisma.weddingEvent.findMany({ where: { weddingId }, orderBy: { sortOrder: "asc" } }),
    prisma.seatingLayout.findMany({ where: { weddingId } }),
  ]);

  const layoutByEvent: Record<
    string,
    { elements: LayoutElement[]; canvasWidth: number; canvasHeight: number; background: Background; roomShape: RoomPoint[] }
  > = {};
  for (const layout of layouts) {
    if (!layout.eventId) continue;
    layoutByEvent[layout.eventId] = {
      elements: layout.elements as LayoutElement[],
      canvasWidth: layout.canvasWidth,
      canvasHeight: layout.canvasHeight,
      background: layout.background === "garden" ? "garden" : "indoor",
      roomShape: layout.roomShape as RoomPoint[],
    };
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Distribución del salón" description={"Un salón por evento. Arrastra, redimensiona y rota mesas, sillas de ceremonia, altar, escenario y más."} />
      <DistribucionEventTabsClient events={events} layoutByEvent={layoutByEvent} />
    </div>
  );
}
