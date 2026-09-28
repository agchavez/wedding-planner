import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { getTableOptionsWithOccupancy } from "@/lib/seatingLayout";
import { GuestList } from "@/app/(app)/invitados/GuestList";

export const dynamic = "force-dynamic";

export default async function InvitadosPage() {
  const weddingId = await getActiveWeddingId();
  const [guests, tableOptions, groups] = await Promise.all([
    prisma.guest.findMany({ where: { weddingId }, orderBy: { fullName: "asc" } }),
    getTableOptionsWithOccupancy(),
    prisma.guestGroup.findMany({ where: { weddingId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">Invitados</h1>
        <p className="text-sm text-muted-foreground">Gestiona la lista de invitados, su RSVP y su mesa asignada.</p>
      </div>
      <GuestList guests={guests} tableOptions={tableOptions} groupNames={groups.map((g) => g.name)} />
    </div>
  );
}
