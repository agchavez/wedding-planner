import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { DistribucionEventTabsClient } from "@/app/(app)/distribucion/DistribucionEventTabsClient";
import type { Background } from "@/app/(app)/distribucion/canvasStore";
import type { LayoutElement } from "@/generated/prisma";

export const dynamic = "force-dynamic";

export default async function DistribucionPage() {
  const weddingId = await getActiveWeddingId();
  const [events, layouts] = await Promise.all([
    prisma.weddingEvent.findMany({ where: { weddingId }, orderBy: { sortOrder: "asc" } }),
    prisma.seatingLayout.findMany({ where: { weddingId } }),
  ]);

  const layoutByEvent: Record<
    string,
    { elements: LayoutElement[]; canvasWidth: number; canvasHeight: number; background: Background }
  > = {};
  for (const layout of layouts) {
    if (!layout.eventId) continue;
    layoutByEvent[layout.eventId] = {
      elements: layout.elements as LayoutElement[],
      canvasWidth: layout.canvasWidth,
      canvasHeight: layout.canvasHeight,
      background: layout.background === "garden" ? "garden" : "indoor",
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">Distribución del salón</h1>
        <p className="text-sm text-muted-foreground">
          Un salón por evento. Arrastra, redimensiona y rota mesas, sillas de ceremonia, altar, escenario y más.
        </p>
      </div>
      <DistribucionEventTabsClient events={events} layoutByEvent={layoutByEvent} />
    </div>
  );
}
