import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { getTableOptionsWithOccupancy } from "@/lib/seatingLayout";
import { GuestList } from "@/app/(app)/invitados/GuestList";

export const dynamic = "force-dynamic";

export default async function InvitadosPage() {
  const weddingId = await getActiveWeddingId();
  const [guests, tableOptions] = await Promise.all([
    prisma.guest.findMany({ where: { weddingId }, orderBy: { fullName: "asc" } }),
    getTableOptionsWithOccupancy(),
  ]);

  return (
    <GuestList guests={guests} tableOptions={tableOptions} />
  );
}
