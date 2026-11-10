import "server-only";
import { prisma } from "@/lib/prisma";
import { requireWeddingContext } from "@/lib/wedding";
import { getInvitationSettings, invitationDesigns, toInvitationData } from "@/lib/guestInvitations";
import { projectDesign } from "@/lib/invitationBlocks";

/** Borrador de la invitación de la boda activa (solo con sesión: lo exigen el proxy y requireWeddingContext). */
export async function loadDraftInvitation() {
  const { weddingId } = await requireWeddingContext();
  const [wedding, settings] = await Promise.all([
    prisma.wedding.findUniqueOrThrow({ where: { id: weddingId } }),
    getInvitationSettings(weddingId),
  ]);
  const data = toInvitationData(wedding, settings);
  const { draft } = invitationDesigns(settings, data);
  return { wedding, data: { ...data, ...projectDesign(draft) }, draft };
}

/** Invitado de muestra para las vistas previas (?nombre=…&lugares=…). */
export function sampleGuest(nombre: unknown, lugares: unknown) {
  const name = typeof nombre === "string" && nombre.trim() ? nombre.trim().slice(0, 80) : "Ana López";
  const seats = Math.min(10, Math.max(1, Number(lugares) || 2));
  return { name, seats };
}
