"use client";

import { toast } from "sonner";
import { seatGuest, unseatGuest, type SeatActionResult } from "@/app/(app)/distribucion/seating-actions";
import { useCanvasStore } from "@/app/(app)/distribucion/canvasStore";
import { useGuestSeatingStore } from "@/app/(app)/distribucion/guestSeatingStore";
import { isSameSeat, planSeat, seatPlanMessage, type GuestSeatUpdate } from "@/lib/guestSeating";
import { isTableType } from "@/lib/seatGeometry";

/**
 * Guarda el plano antes de sentar a alguien: la mesa (o su capacidad) puede ser nueva y el
 * servidor valida contra lo guardado. Lo registra el editor; devuelve false si no se pudo guardar.
 */
let flushLayout: () => Promise<boolean> = async () => true;

export function registerLayoutFlush(fn: () => Promise<boolean>) {
  flushLayout = fn;
  return () => {
    if (flushLayout === fn) flushLayout = async () => true;
  };
}

/** Cambio optimista + server action; si falla, se vuelve a lo anterior y se avisa. */
async function run(optimistic: GuestSeatUpdate[], action: () => Promise<SeatActionResult>) {
  const store = useGuestSeatingStore.getState();
  const previous = store.guests;
  store.setPending(1);
  store.applyUpdates(optimistic);
  try {
    const result = await action();
    if (!result.ok) {
      useGuestSeatingStore.getState().setGuests(previous);
      toast.error(result.error);
      return false;
    }
    useGuestSeatingStore.getState().applyUpdates(result.updates);
    return true;
  } catch (error) {
    console.error("No se pudo cambiar la mesa del invitado", error);
    useGuestSeatingStore.getState().setGuests(previous);
    toast.error("No se pudo guardar el cambio. Revisa tu conexión y vuelve a intentar.");
    return false;
  } finally {
    useGuestSeatingStore.getState().setPending(-1);
  }
}

/**
 * Sienta a un invitado en una mesa del plano: en `seatIndex` si se eligió una silla, o en la
 * primera libre. Avisa (y no asigna) si el grupo no cabe.
 */
export async function seatGuestAt(guestId: string, tableId: string, seatIndex: number | null = null) {
  const canvas = useCanvasStore.getState();
  const { guests } = useGuestSeatingStore.getState();
  const guest = guests.find((g) => g.id === guestId);
  const table = canvas.elements.find((el) => el.id === tableId && isTableType(el.type));
  if (!guest || !table) return false;

  // Soltarlo en su misma silla (o sobre su misma mesa) no cambia nada: no se guarda ni se audita.
  const tableGuests = guests.filter((g) => g.tableElementId === tableId);
  if (isSameSeat(table.capacity, tableGuests, guestId, seatIndex)) return true;

  // Misma validación que el servidor, para avisar al instante.
  const others = tableGuests.filter((g) => g.id !== guestId);
  const plan = planSeat(table.capacity, others, guest, seatIndex);
  if (!plan.ok) {
    toast.error(seatPlanMessage(table.label, guest, plan));
    return false;
  }

  if (!(await flushLayout())) {
    toast.error("Primero hay que guardar el plano. Revisa tu conexión y vuelve a intentar.");
    return false;
  }

  const optimistic = [
    { id: guestId, tableElementId: tableId, seatIndex: plan.seatIndex },
    ...plan.moved.map((m) => ({ id: m.id, tableElementId: tableId, seatIndex: m.seatIndex })),
  ];
  const ok = await run(optimistic, () => seatGuest(guestId, tableId, seatIndex));
  if (ok && plan.moved.length > 0) toast.info(`Se recorrieron sillas de ${table.label || "la mesa"} para que el grupo quede junto.`);
  return ok;
}

/** Quita a un invitado (y sus acompañantes) de su mesa. */
export async function unseatGuestById(guestId: string) {
  return run([{ id: guestId, tableElementId: null, seatIndex: null }], () => unseatGuest(guestId));
}
