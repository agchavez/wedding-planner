"use client";

import { create } from "zustand";
import type { GuestSeatUpdate, SeatColorMode, SeatingGuest } from "@/lib/guestSeating";

/** Mesa (y silla, si se eligió una) a la que se va a sentar a alguien. */
export type SeatTarget = { tableId: string; seatIndex: number | null };

/** MIME propio del arrastre HTML de un invitado (del panel al plano y del plano al panel). */
export const GUEST_DRAG_TYPE = "application/x-wedding-guest";

/** Atributo de la zona "Quitar de la mesa" del panel (la busca el arrastre de una silla del plano). */
export const UNSEAT_ZONE_ATTR = "data-guest-unseat-zone";

type GuestSeatingState = {
  guests: SeatingGuest[];
  /** Operaciones de sentar/quitar en curso: mientras haya, no se pisan con datos del servidor. */
  pending: number;
  colorMode: SeatColorMode;
  /** Silla o mesa abierta en la hoja "¿Quién va en esta silla?". */
  sheetTarget: SeatTarget | null;
  /** Mesa/silla bajo el cursor mientras se arrastra un invitado. */
  dropTarget: SeatTarget | null;
  /** Invitado que se está arrastrando (para la ayuda sobre el plano). */
  draggingGuestId: string | null;
  /** El invitado arrastrado está sobre la zona "Quitar de la mesa" del panel. */
  overUnseatZone: boolean;
  setGuests: (guests: SeatingGuest[]) => void;
  applyUpdates: (updates: GuestSeatUpdate[]) => void;
  setPending: (delta: 1 | -1) => void;
  setColorMode: (mode: SeatColorMode) => void;
  openSheet: (target: SeatTarget | null) => void;
  setDropTarget: (target: SeatTarget | null) => void;
  setDraggingGuest: (id: string | null) => void;
  setOverUnseatZone: (over: boolean) => void;
};

const sameTarget = (a: SeatTarget | null, b: SeatTarget | null) =>
  a === b || (!!a && !!b && a.tableId === b.tableId && a.seatIndex === b.seatIndex);

export const useGuestSeatingStore = create<GuestSeatingState>((set) => ({
  guests: [],
  pending: 0,
  colorMode: "side",
  sheetTarget: null,
  dropTarget: null,
  draggingGuestId: null,
  overUnseatZone: false,
  setGuests: (guests) => set({ guests }),
  applyUpdates: (updates) =>
    set((s) => {
      const byId = new Map(updates.map((u) => [u.id, u]));
      return {
        guests: s.guests.map((g) => {
          const u = byId.get(g.id);
          return u ? { ...g, tableElementId: u.tableElementId, seatIndex: u.seatIndex } : g;
        }),
      };
    }),
  setPending: (delta) => set((s) => ({ pending: Math.max(0, s.pending + delta) })),
  setColorMode: (colorMode) => set({ colorMode }),
  openSheet: (sheetTarget) => set({ sheetTarget }),
  // Se llama en cada dragover: solo actualiza (y re-renderiza) si cambió la mesa o la silla.
  setDropTarget: (target) => set((s) => (sameTarget(s.dropTarget, target) ? s : { dropTarget: target })),
  setDraggingGuest: (draggingGuestId) => set({ draggingGuestId }),
  setOverUnseatZone: (overUnseatZone) => set((s) => (s.overUnseatZone === overUnseatZone ? s : { overUnseatZone })),
}));
