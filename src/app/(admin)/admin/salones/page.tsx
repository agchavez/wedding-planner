import { PageHeader } from "@/app/(admin)/admin/_components/ui";
import { VenuesAdmin, type AdminVenue } from "@/app/(admin)/admin/salones/VenuesAdmin";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { weddingDisplayName } from "@/lib/wedding";
import { layerSizeMeters, parseVisibility } from "@/lib/venueLibrary";
import { latestVersions, versionToData } from "@/lib/venueRooms";

export const dynamic = "force-dynamic";

/** Biblioteca de salones: el admin publica lugares para toda la plataforma, los edita o archiva. */
export default async function AdminVenuesPage() {
  await requireAdmin();
  const venues = await prisma.venue.findMany({ orderBy: [{ visibility: "desc" }, { name: "asc" }] });
  const rooms = await prisma.venueRoom.findMany({ where: { venueId: { in: venues.map((v) => v.id) } }, orderBy: { name: "asc" } });
  const [latest, versions, weddings] = await Promise.all([
    latestVersions(rooms.map((r) => r.id)),
    prisma.venueRoomVersion.findMany({ where: { roomId: { in: rooms.map((r) => r.id) } }, select: { id: true, roomId: true } }),
    prisma.wedding.findMany({
      where: { id: { in: venues.flatMap((v) => (v.weddingId ? [v.weddingId] : [])) } },
      select: { id: true, partner1: true, partner2: true },
    }),
  ]);
  // Planos (layouts) que usan alguna versión de cada salón.
  const layouts = await prisma.seatingLayout.findMany({
    where: { baseRoomVersionId: { in: versions.map((v) => v.id) } },
    select: { baseRoomVersionId: true },
  });
  const roomOfVersion = new Map(versions.map((v) => [v.id, v.roomId]));
  const usage = new Map<string, number>();
  for (const l of layouts) {
    const roomId = l.baseRoomVersionId && roomOfVersion.get(l.baseRoomVersionId);
    if (roomId) usage.set(roomId, (usage.get(roomId) ?? 0) + 1);
  }
  const weddingName = new Map(weddings.map((w) => [w.id, weddingDisplayName(w)]));

  const data: AdminVenue[] = venues.map((venue) => ({
    id: venue.id,
    name: venue.name,
    city: venue.city,
    address: venue.address,
    notes: venue.notes,
    visibility: parseVisibility(venue.visibility),
    archived: !!venue.archivedAt,
    createdByName: venue.createdByName,
    weddingName: venue.weddingId ? (weddingName.get(venue.weddingId) ?? null) : null,
    rooms: rooms
      .filter((r) => r.venueId === venue.id)
      .map((room) => {
        const version = latest.get(room.id);
        const layer = version ? versionToData(version) : null;
        return {
          id: room.id,
          name: room.name,
          banquetCapacity: room.banquetCapacity ?? null,
          cocktailCapacity: room.cocktailCapacity ?? null,
          theaterCapacity: room.theaterCapacity ?? null,
          archived: !!room.archivedAt,
          version: layer?.version ?? 0,
          layer,
          sizeMeters: layer ? layerSizeMeters(layer) : null,
          usedBy: usage.get(room.id) ?? 0,
        };
      }),
  }));

  const platform = data.filter((v) => v.visibility === "platform" && !v.archived).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salones"
        description={`${data.length} ${data.length === 1 ? "lugar" : "lugares"} en la biblioteca · ${platform} ${platform === 1 ? "publicado" : "publicados"} para toda la plataforma. Los usuarios los guardan desde el editor de distribución.`}
      />
      <VenuesAdmin venues={data} />
    </div>
  );
}
