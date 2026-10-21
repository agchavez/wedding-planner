"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";
import { cleanName, CATALOG_NAME_MAX, nameKey } from "@/lib/catalog";
import { isLabelColor, LABEL_COLORS, type LabelOption } from "@/lib/guestLabels";

export type LabelResult = { ok: true; label: LabelOption } | { ok: false; error: string };

function revalidateLabels() {
  revalidatePath("/invitados");
  revalidatePath("/invitaciones");
  revalidatePath("/configuracion");
}

async function validate(weddingId: string, raw: unknown, exceptId?: string) {
  const name = cleanName(raw);
  if (!name) return { error: "Escribe el nombre de la etiqueta." };
  if (name.length > CATALOG_NAME_MAX) return { error: `El nombre es muy largo (máximo ${CATALOG_NAME_MAX} caracteres).` };
  const labels = await prisma.guestLabel.findMany({ where: { weddingId } });
  const existing = labels.find((l) => l.id !== exceptId && nameKey(l.name) === nameKey(name));
  return { name, existing, count: labels.length };
}

/** Crea una etiqueta (o devuelve la existente con el mismo nombre). Sin color, toma el siguiente de la paleta. */
export async function createLabel(rawName: string, color?: string): Promise<LabelResult> {
  const weddingId = await getEditableWeddingId();
  const check = await validate(weddingId, rawName);
  if ("error" in check) return { ok: false, error: check.error! };
  if (check.existing) return { ok: true, label: check.existing };

  const palette = Object.keys(LABEL_COLORS);
  const label = await prisma.guestLabel.create({
    data: { weddingId, name: check.name, color: isLabelColor(color) ? color : palette[check.count % palette.length] },
  });
  await audit("guest_label.create", `Creó la etiqueta "${label.name}"`, { weddingId, targetId: label.id });
  revalidateLabels();
  return { ok: true, label: { id: label.id, name: label.name, color: label.color } };
}

export async function updateLabel(id: string, input: { name: string; color: string }): Promise<LabelResult> {
  const weddingId = await getEditableWeddingId();
  const check = await validate(weddingId, input.name, id);
  if ("error" in check) return { ok: false, error: check.error! };
  if (check.existing) return { ok: false, error: `Ya existe la etiqueta "${check.existing.name}".` };

  const label = await prisma.guestLabel.update({
    where: { id, weddingId },
    data: { name: check.name, ...(isLabelColor(input.color) ? { color: input.color } : {}) },
  });
  await audit("guest_label.update", `Editó la etiqueta "${label.name}"`, { weddingId, targetId: id });
  revalidateLabels();
  return { ok: true, label: { id: label.id, name: label.name, color: label.color } };
}

/** Borra la etiqueta y la quita de los invitados que la tenían. */
export async function deleteLabel(id: string) {
  const weddingId = await getEditableWeddingId();
  const label = await prisma.guestLabel.delete({ where: { id, weddingId } });
  const guests = await prisma.guest.findMany({ where: { weddingId, labelIds: { has: id } }, select: { id: true, labelIds: true } });
  await Promise.all(
    guests.map((g) => prisma.guest.update({ where: { id: g.id }, data: { labelIds: g.labelIds.filter((l) => l !== id) } }))
  );
  await audit("guest_label.delete", `Eliminó la etiqueta "${label.name}"`, { weddingId, targetId: id });
  revalidateLabels();
}
