"use client";

import { useMemo } from "react";
import { useGuestSeatingStore } from "@/app/(app)/distribucion/guestSeatingStore";
import type { TableSeatView } from "@/app/(app)/distribucion/shapes/TableSeats";
import {
  guestInitials,
  partySize,
  resolveTableSeats,
  seatColorSlot,
  sortedGroups,
  type SeatingGuest,
} from "@/lib/guestSeating";

/** Nombre de una mesa para listas y avisos. */
export function tableName(el: { label: string; tableNumber: number | null }) {
  return el.label || (el.tableNumber ? `Mesa ${el.tableNumber}` : "Mesa sin nombre");
}

/** Iniciales de una silla: el titular, o su acompañante (por nombre si lo tiene, si no "+1"). */
export function seatLabel(guest: SeatingGuest, companion: number) {
  if (companion === 0) return guestInitials(guest.fullName);
  const name = guest.plusOneNames[companion - 1];
  return name ? guestInitials(name) : `+${companion}`;
}

/** Color (índice de seatColorSlot) de cada invitado según el modo elegido en el panel. */
export function useGuestColorSlot() {
  const guests = useGuestSeatingStore((s) => s.guests);
  const colorMode = useGuestSeatingStore((s) => s.colorMode);
  const groups = useMemo(() => sortedGroups(guests), [guests]);
  return useMemo(() => (guest: SeatingGuest) => seatColorSlot(guest, colorMode, groups), [colorMode, groups]);
}

/** Invitados sentados en cada mesa, en el orden del servidor (SEATING_GUEST_ORDER). */
export function guestsByTable(guests: SeatingGuest[]) {
  const byTable = new Map<string, SeatingGuest[]>();
  for (const guest of guests) {
    if (!guest.tableElementId) continue;
    const list = byTable.get(guest.tableElementId);
    if (list) list.push(guest);
    else byTable.set(guest.tableElementId, [guest]);
  }
  return byTable;
}

/** Ocupación de una mesa lista para dibujar (sillas con iniciales y color). */
export function buildTableSeatView(
  capacity: number | null,
  seated: SeatingGuest[],
  colorOf: (guest: SeatingGuest) => string
): TableSeatView {
  const byId = new Map(seated.map((g) => [g.id, g]));
  const { seats } = resolveTableSeats(capacity, seated);
  return {
    capacity: capacity ?? 0,
    occupied: seated.reduce((n, g) => n + partySize(g), 0),
    seats: seats.map((seat) => {
      const guest = seat && byId.get(seat.guestId);
      return guest ? { guestId: guest.id, companion: seat.companion, label: seatLabel(guest, seat.companion), color: colorOf(guest) } : null;
    }),
  };
}
