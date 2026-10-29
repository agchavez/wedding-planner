"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";
import { isTableType } from "@/lib/seatGeometry";
import { isSameSeat, planSeat, seatPlanMessage, SEATING_GUEST_ORDER, type GuestSeatUpdate } from "@/lib/guestSeating";

export type SeatActionResult = { ok: true; updates: GuestSeatUpdate[]; repacked: boolean } | { ok: false; error: string };

const OBJECT_ID = /^[a-f0-9]{24}$/;

// Si otra persona cambia la misma mesa al mismo tiempo, Mongo aborta una de las dos
// transacciones (P2034) y se vuelve a intentar con los datos ya actualizados.
const SEAT_TX_ATTEMPTS = 3;

function revalidateSeating() {
  revalidatePath("/distribucion");
  revalidatePath("/invitados");
  revalidatePath("/invitaciones");
}

function isWriteConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

type SeatTxResult =
  | { ok: false; error: string }
  | { ok: true; updates: GuestSeatUpdate[]; repacked: boolean; summary: string | null };

/**
 * Sienta a un invitado (con sus acompañantes, en sillas consecutivas) en una mesa: en la silla
 * `seatIndex` si se soltó sobre una, o en la primera libre. También sirve para cambiarlo de mesa
 * o de silla. Si la mesa no tiene lugar para todo el grupo, o la silla elegida es de otro, no
 * asigna nada.
 *
 * Todo (lectura de la mesa, validación y escritura) va en una transacción que además toca el
 * documento del salón: dos cambios simultáneos en el mismo salón chocan y el segundo se repite
 * con la ocupación real, así no se pasa la capacidad ni se pisa un cambio de otro editor.
 */
export async function seatGuest(guestId: string, tableElementId: string, seatIndex: number | null = null): Promise<SeatActionResult> {
  const weddingId = await getEditableWeddingId();
  if (!OBJECT_ID.test(String(guestId)) || typeof tableElementId !== "string" || !tableElementId || tableElementId.length > 100) {
    return { ok: false, error: "Datos inválidos." };
  }
  const target = Number.isInteger(seatIndex) && (seatIndex as number) >= 0 ? seatIndex : null;

  const attempt = () =>
    prisma.$transaction(async (tx): Promise<SeatTxResult> => {
      // En serie: las operaciones de una transacción de Mongo comparten sesión.
      const guest = await tx.guest.findFirst({ where: { id: guestId, weddingId } });
      // Las mesas viven embebidas en SeatingLayout.elements.
      const layouts = await tx.seatingLayout.findMany({ where: { weddingId }, select: { id: true, elements: true } });
      const tableGuests = await tx.guest.findMany({
        where: { weddingId, tableElementId },
        select: { id: true, plusOnes: true, seatIndex: true },
        orderBy: SEATING_GUEST_ORDER,
      });
      if (!guest) return { ok: false, error: "No se encontró al invitado." };
      const layout = layouts.find((l) => l.elements.some((el) => el.id === tableElementId && isTableType(el.type)));
      const table = layout?.elements.find((el) => el.id === tableElementId);
      if (!layout || !table) return { ok: false, error: "La mesa ya no existe en la distribución." };

      // Soltarlo donde ya estaba: nada que guardar (ni auditar).
      if (isSameSeat(table.capacity, tableGuests, guest.id, target)) {
        return { ok: true, updates: [{ id: guest.id, tableElementId, seatIndex: guest.seatIndex }], repacked: false, summary: null };
      }

      const others = tableGuests.filter((g) => g.id !== guest.id);
      const plan = planSeat(table.capacity, others, guest, target);
      if (!plan.ok) return { ok: false, error: seatPlanMessage(table.label, guest, plan) };

      const updates: GuestSeatUpdate[] = [
        { id: guest.id, tableElementId, seatIndex: plan.seatIndex },
        ...plan.moved.map((m) => ({ id: m.id, tableElementId, seatIndex: m.seatIndex })),
      ];
      // "Candado" del salón: escribir su documento hace que una transacción simultánea sobre
      // el mismo salón falle con conflicto de escritura en vez de validar con datos viejos.
      await tx.seatingLayout.update({ where: { id: layout.id }, data: { updatedAt: new Date() } });
      for (const u of updates) {
        await tx.guest.update({ where: { id: u.id, weddingId }, data: { tableElementId: u.tableElementId, seatIndex: u.seatIndex } });
      }

      const tableName = table.label || "la mesa";
      // Si su mesa anterior ya se borró del plano, en realidad estaba sin mesa: "Sentó", no "Cambió".
      const hadTable =
        !!guest.tableElementId &&
        layouts.some((l) => l.elements.some((el) => el.id === guest.tableElementId && isTableType(el.type)));
      const summary =
        hadTable && guest.tableElementId !== tableElementId
          ? `Cambió a "${guest.fullName}" a "${tableName}"`
          : `Sentó a "${guest.fullName}" en "${tableName}"`;
      return { ok: true, updates, repacked: plan.moved.length > 0, summary };
    });

  let result: SeatTxResult | null = null;
  for (let i = 0; i < SEAT_TX_ATTEMPTS && !result; i++) {
    try {
      result = await attempt();
    } catch (error) {
      if (!isWriteConflict(error)) throw error;
    }
  }
  if (!result) return { ok: false, error: "Alguien más está cambiando esta mesa en este momento. Vuelve a intentarlo." };
  if (!result.ok) return result;

  if (result.summary) {
    await audit("guest.assign_table", result.summary, { weddingId, targetId: guestId });
    revalidateSeating();
  }
  return { ok: true, updates: result.updates, repacked: result.repacked };
}

/** Quita a un invitado (y sus acompañantes) de su mesa. */
export async function unseatGuest(guestId: string): Promise<SeatActionResult> {
  const weddingId = await getEditableWeddingId();
  if (!OBJECT_ID.test(String(guestId))) return { ok: false, error: "Datos inválidos." };
  const guest = await prisma.guest.findFirst({ where: { id: guestId, weddingId } });
  if (!guest) return { ok: false, error: "No se encontró al invitado." };

  if (guest.tableElementId !== null || guest.seatIndex !== null) {
    await prisma.guest.update({ where: { id: guest.id, weddingId }, data: { tableElementId: null, seatIndex: null } });
    await audit("guest.assign_table", `Quitó la mesa de "${guest.fullName}"`, { weddingId, targetId: guest.id });
    revalidateSeating();
  }
  return { ok: true, updates: [{ id: guest.id, tableElementId: null, seatIndex: null }], repacked: false };
}
