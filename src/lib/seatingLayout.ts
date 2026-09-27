import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { isTableType, type ElementType } from "@/lib/seatGeometry";
import type { LayoutElement } from "@/generated/prisma";

/**
 * Una distribución por evento de la boda (WeddingEvent). El SeatingLayout comparte el
 * mismo id que su WeddingEvent — evita condiciones de carrera al inicializar (mismo
 * patrón de upsert-por-id-fijo que getActiveWeddingId en lib/wedding.ts) y hace explícita
 * la relación 1:1 entre evento y distribución.
 */
export async function getOrCreateSeatingLayout(eventId: string) {
  const weddingId = await getActiveWeddingId();
  // El evento debe pertenecer a la boda del usuario (evita leer/sobrescribir otra boda).
  await prisma.weddingEvent.findFirstOrThrow({ where: { id: eventId, weddingId }, select: { id: true } });
  return prisma.seatingLayout.upsert({
    where: { id: eventId },
    update: {},
    create: { id: eventId, weddingId, eventId, elements: [] },
  });
}

export type TableOption = {
  id: string;
  label: string;
  tableNumber: number | null;
  capacity: number;
  occupied: number;
  eventName: string;
};

export async function getTableOptionsWithOccupancy(): Promise<TableOption[]> {
  const weddingId = await getActiveWeddingId();
  const [layouts, events, guests] = await Promise.all([
    prisma.seatingLayout.findMany({ where: { weddingId } }),
    prisma.weddingEvent.findMany({ where: { weddingId } }),
    prisma.guest.findMany({ where: { weddingId }, select: { tableElementId: true } }),
  ]);

  const eventNameById = new Map(events.map((e) => [e.id, e.name]));

  const occupancyByTable = new Map<string, number>();
  for (const guest of guests) {
    if (!guest.tableElementId) continue;
    occupancyByTable.set(guest.tableElementId, (occupancyByTable.get(guest.tableElementId) ?? 0) + 1);
  }

  const options: TableOption[] = [];
  for (const layout of layouts) {
    const elements = layout.elements as LayoutElement[];
    const eventName = (layout.eventId && eventNameById.get(layout.eventId)) || "Sin evento";
    for (const el of elements) {
      if (!isTableType(el.type as ElementType)) continue;
      options.push({
        id: el.id,
        label: el.label || "Mesa sin nombre",
        tableNumber: el.tableNumber ?? null,
        capacity: el.capacity ?? 0,
        occupied: occupancyByTable.get(el.id) ?? 0,
        eventName,
      });
    }
  }

  return options.sort((a, b) => (a.tableNumber ?? 0) - (b.tableNumber ?? 0));
}
