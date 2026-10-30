"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/session";
import { parseCapacity, parseVisibility } from "@/lib/venueLibrary";
import { OBJECT_ID } from "@/lib/venueRooms";

export type ActionResult = { error?: string };

/** Acción de admin sobre la biblioteca de salones: valida el id, audita y refresca. */
async function run(targetId: string, action: string, fn: () => Promise<string>): Promise<ActionResult> {
  await requireAdmin();
  if (!OBJECT_ID.test(String(targetId))) return { error: "Id no válido." };
  try {
    const summary = await fn();
    await audit(action, summary, { category: "admin", targetId });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado." };
  }
  revalidatePath("/admin/salones");
  revalidatePath("/distribucion");
  return {};
}

const text = (formData: FormData, name: string, max: number) => String(formData.get(name) ?? "").trim().slice(0, max);

/** Solo un administrador publica un lugar para toda la plataforma (o lo vuelve privado). */
export async function setVenueVisibility(venueId: string, visibility: string): Promise<ActionResult> {
  return run(venueId, "admin.venue_visibility", async () => {
    const value = parseVisibility(visibility);
    const venue = await prisma.venue.update({ where: { id: venueId }, data: { visibility: value } });
    return value === "platform" ? `Publicó el lugar "${venue.name}" para toda la plataforma` : `Volvió privado el lugar "${venue.name}"`;
  });
}

export async function updateVenue(venueId: string, formData: FormData): Promise<ActionResult> {
  return run(venueId, "admin.venue_update", async () => {
    const name = text(formData, "name", 100);
    if (!name) throw new Error("Escribe el nombre del lugar.");
    const venue = await prisma.venue.update({
      where: { id: venueId },
      data: { name, city: text(formData, "city", 80), address: text(formData, "address", 200), notes: text(formData, "notes", 1000) },
    });
    return `Editó el lugar "${venue.name}"`;
  });
}

/** Archivar oculta el lugar de la biblioteca; los planos que ya lo usan no cambian. */
export async function setVenueArchived(venueId: string, archived: boolean): Promise<ActionResult> {
  return run(venueId, "admin.venue_archive", async () => {
    const venue = await prisma.venue.update({ where: { id: venueId }, data: { archivedAt: archived ? new Date() : null } });
    return `${archived ? "Archivó" : "Restauró"} el lugar "${venue.name}"`;
  });
}

export async function updateVenueRoom(roomId: string, formData: FormData): Promise<ActionResult> {
  return run(roomId, "admin.venue_room_update", async () => {
    const name = text(formData, "name", 80);
    if (!name) throw new Error("Escribe el nombre del salón.");
    const room = await prisma.venueRoom.update({
      where: { id: roomId },
      data: {
        name,
        banquetCapacity: parseCapacity(formData.get("banquetCapacity")),
        cocktailCapacity: parseCapacity(formData.get("cocktailCapacity")),
        theaterCapacity: parseCapacity(formData.get("theaterCapacity")),
      },
    });
    return `Editó el salón "${room.name}"`;
  });
}

export async function setRoomArchived(roomId: string, archived: boolean): Promise<ActionResult> {
  return run(roomId, "admin.venue_room_archive", async () => {
    const room = await prisma.venueRoom.update({ where: { id: roomId }, data: { archivedAt: archived ? new Date() : null } });
    return `${archived ? "Archivó" : "Restauró"} el salón "${room.name}"`;
  });
}
