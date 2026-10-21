import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { getTableOptionsWithOccupancy } from "@/lib/seatingLayout";
import { GuestList } from "@/app/(app)/invitados/GuestList";

export const dynamic = "force-dynamic";

export default async function InvitadosPage() {
  const weddingId = await getActiveWeddingId();
  const [guests, tableOptions, groups, labels] = await Promise.all([
    prisma.guest.findMany({ where: { weddingId }, orderBy: { fullName: "asc" } }),
    getTableOptionsWithOccupancy(),
    prisma.guestGroup.findMany({ where: { weddingId }, orderBy: { name: "asc" } }),
    prisma.guestLabel.findMany({ where: { weddingId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <GuestList
      guests={guests}
      tableOptions={tableOptions}
      groupNames={groups.map((g) => g.name)}
      labels={labels.map((l) => ({ id: l.id, name: l.name, color: l.color }))}
    />
  );
}
