"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";
import { parseSide, SIDE_LABEL } from "@/lib/guestLabels";

function parsePlusOneNames(raw: string): string[] {
  return raw
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

/** Solo ids de etiquetas que existen en la boda (el formulario manda `labelIds` repetido). */
async function parseLabelIds(weddingId: string, formData: FormData): Promise<string[]> {
  const ids = [...new Set(formData.getAll("labelIds").map(String).filter((id) => /^[a-f0-9]{24}$/.test(id)))];
  if (ids.length === 0) return [];
  const labels = await prisma.guestLabel.findMany({ where: { weddingId, id: { in: ids } }, select: { id: true } });
  return labels.map((l) => l.id);
}

async function guestData(weddingId: string, formData: FormData) {
  return {
    fullName: String(formData.get("fullName") ?? "").trim(),
    group: String(formData.get("group") ?? ""),
    rsvpStatus: String(formData.get("rsvpStatus") ?? "pending"),
    plusOnes: Math.max(0, Number(formData.get("plusOnes") ?? 0) || 0),
    plusOneNames: parsePlusOneNames(String(formData.get("plusOneNames") ?? "")),
    dietaryRestrictions: String(formData.get("dietaryRestrictions") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    side: parseSide(formData.get("side")),
    phone: String(formData.get("phone") ?? "").trim().slice(0, 30),
    labelIds: await parseLabelIds(weddingId, formData),
  };
}

function revalidateGuests() {
  revalidatePath("/invitados");
  revalidatePath("/invitaciones");
  revalidatePath("/");
}

export async function createGuest(formData: FormData) {
  const weddingId = await getEditableWeddingId();

  const guest = await prisma.guest.create({ data: { weddingId, ...(await guestData(weddingId, formData)) } });
  await audit("guest.create", `Agregó al invitado "${guest.fullName}"`, { weddingId, targetId: guest.id });

  revalidateGuests();
}

export async function updateGuest(id: string, formData: FormData) {
  const weddingId = await getEditableWeddingId();
  const guest = await prisma.guest.update({ where: { id, weddingId }, data: await guestData(weddingId, formData) });
  await audit("guest.update", `Editó al invitado "${guest.fullName}"`, { weddingId, targetId: id });

  revalidateGuests();
}

export async function deleteGuest(id: string) {
  const weddingId = await getEditableWeddingId();
  const guest = await prisma.guest.delete({ where: { id, weddingId } });
  await audit("guest.delete", `Eliminó al invitado "${guest.fullName}"`, { weddingId, targetId: id });

  revalidateGuests();
}

export async function assignGuestTable(id: string, tableElementId: string | null) {
  const weddingId = await getEditableWeddingId();
  const guest = await prisma.guest.update({
    where: { id, weddingId },
    data: { tableElementId },
  });
  await audit("guest.assign_table", tableElementId ? `Asignó mesa a "${guest.fullName}"` : `Quitó la mesa de "${guest.fullName}"`, { weddingId, targetId: id });
  revalidatePath("/invitados");
  revalidatePath("/distribucion");
}

/** Acciones masivas sobre los invitados seleccionados en la lista. */
export async function bulkUpdateGuests(
  ids: string[],
  change: { side?: string; addLabelId?: string; removeLabelId?: string; rsvpStatus?: string }
) {
  const weddingId = await getEditableWeddingId();
  const guests = await prisma.guest.findMany({ where: { weddingId, id: { in: ids.slice(0, 1000) } } });
  if (guests.length === 0) return;

  let summary = "";
  if (change.side !== undefined) {
    const side = parseSide(change.side);
    await prisma.guest.updateMany({ where: { weddingId, id: { in: guests.map((g) => g.id) } }, data: { side } });
    summary = `Marcó ${guests.length} invitados como "${SIDE_LABEL[side]}"`;
  } else if (change.rsvpStatus && ["pending", "confirmed", "declined"].includes(change.rsvpStatus)) {
    await prisma.guest.updateMany({
      where: { weddingId, id: { in: guests.map((g) => g.id) } },
      data: { rsvpStatus: change.rsvpStatus },
    });
    summary = `Cambió la confirmación de ${guests.length} invitados`;
  } else if (change.addLabelId || change.removeLabelId) {
    const labelId = (change.addLabelId ?? change.removeLabelId)!;
    const label = await prisma.guestLabel.findFirst({ where: { id: labelId, weddingId } });
    if (!label) return;
    await Promise.all(
      guests.map((g) => {
        const next = change.addLabelId
          ? [...new Set([...g.labelIds, labelId])]
          : g.labelIds.filter((id) => id !== labelId);
        return prisma.guest.update({ where: { id: g.id }, data: { labelIds: next } });
      })
    );
    summary = change.addLabelId
      ? `Agregó la etiqueta "${label.name}" a ${guests.length} invitados`
      : `Quitó la etiqueta "${label.name}" de ${guests.length} invitados`;
  } else {
    return;
  }

  await audit("guest.bulk_update", summary, { weddingId });
  revalidateGuests();
}
