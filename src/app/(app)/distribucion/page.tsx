import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { DistribucionEventTabsClient } from "@/app/(app)/distribucion/DistribucionEventTabsClient";
import type { LayoutData } from "@/app/(app)/distribucion/DistribucionEventTabsClient";
import type { RoomPoint } from "@/lib/seatGeometry";
import { SEATING_GUEST_ORDER, type SeatingGuest } from "@/lib/guestSeating";
import { baseRoomInfos } from "@/lib/venueRooms";
import type { LayoutElement } from "@/generated/prisma";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function DistribucionPage() {
  const weddingId = await getActiveWeddingId();
  const [events, layouts, guests, labels] = await Promise.all([
    prisma.weddingEvent.findMany({ where: { weddingId }, orderBy: { sortOrder: "asc" } }),
    prisma.seatingLayout.findMany({ where: { weddingId } }),
    // Solo lo que usa el plano; el orden es el mismo que el de las server actions al acomodar sillas.
    prisma.guest.findMany({
      where: { weddingId },
      orderBy: SEATING_GUEST_ORDER,
      select: {
        id: true,
        fullName: true,
        plusOnes: true,
        plusOneNames: true,
        side: true,
        group: true,
        labelIds: true,
        rsvpStatus: true,
        tableElementId: true,
        seatIndex: true,
      },
    }),
    prisma.guestLabel.findMany({ where: { weddingId }, orderBy: { name: "asc" }, select: { id: true, name: true, color: true } }),
  ]);
  // Invitados anteriores no tienen seatIndex: null = el plano los acomoda en la primera silla libre.
  const seatingGuests: SeatingGuest[] = guests.map((g) => ({ ...g, seatIndex: g.seatIndex ?? null }));
  // Salón de la biblioteca en que se basa cada layout (y si hay una versión más nueva).
  const baseRooms = await baseRoomInfos(layouts.flatMap((l) => (l.baseRoomVersionId ? [l.baseRoomVersionId] : [])));

  const layoutByEvent: Record<string, LayoutData> = {};
  for (const layout of layouts) {
    if (!layout.eventId) continue;
    layoutByEvent[layout.eventId] = {
      elements: layout.elements as LayoutElement[],
      canvasWidth: layout.canvasWidth,
      canvasHeight: layout.canvasHeight,
      background: layout.background === "garden" ? "garden" : "indoor",
      roomShape: layout.roomShape as RoomPoint[],
      // Layouts anteriores no tienen estos campos: sin elementos fijos y escala por defecto.
      roomFixtures: layout.roomFixtures ?? [],
      pxPerMeter: layout.pxPerMeter ?? null,
      backgroundImage: layout.backgroundImage ?? null,
      baseRoomVersionId: layout.baseRoomVersionId ?? null,
      baseRoom: (layout.baseRoomVersionId && baseRooms.get(layout.baseRoomVersionId)) || null,
    };
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Distribución del salón" description={"Un salón por evento. Arrastra, redimensiona y rota mesas, sillas de ceremonia, altar, escenario y más; luego sienta a tus invitados arrastrándolos a su mesa."} />
      <DistribucionEventTabsClient events={events} layoutByEvent={layoutByEvent} guests={seatingGuests} labels={labels} />
    </div>
  );
}
