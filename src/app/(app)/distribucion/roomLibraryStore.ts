import { create } from "zustand";
import type { BaseRoomInfo, RoomVersionData } from "@/lib/venueLibrary";

/** Versión de la biblioteca por revisar antes de copiarla al plano (choques con las mesas). */
export type RoomReview = { mode: "use" | "update"; data: RoomVersionData; info: BaseRoomInfo };

type RoomLibraryState = {
  /** Datos de las versiones de la biblioteca conocidas en esta página (para el chip y el aviso). */
  known: Record<string, BaseRoomInfo>;
  dialog: "picker" | "save" | "plan" | null;
  review: RoomReview | null;
  /**
   * Sube cada vez que se cierra un editor (cambio de evento o salir de la página). Una respuesta
   * del servidor que llega con otra sesión es de otro evento y se descarta.
   */
  session: number;
  remember: (info: BaseRoomInfo) => void;
  openDialog: (dialog: RoomLibraryState["dialog"]) => void;
  setReview: (review: RoomReview | null) => void;
};

/**
 * Estado de la biblioteca de salones dentro del editor: qué diálogo está abierto y qué se sabe de
 * cada versión. La versión vinculada al layout vive en el store del lienzo (baseRoomVersionId).
 */
export const useRoomLibraryStore = create<RoomLibraryState>((set) => ({
  known: {},
  dialog: null,
  review: null,
  session: 0,
  remember: (info) => set((s) => ({ known: { ...s.known, [info.versionId]: info } })),
  openDialog: (dialog) => set({ dialog }),
  setReview: (review) => set({ review }),
}));

/** Sesión actual del editor (ver RoomLibraryState.session). */
export function currentLibrarySession() {
  return useRoomLibraryStore.getState().session;
}

/** Al cerrar el editor: sin diálogos abiertos y las respuestas pendientes ya no aplican. */
export function endLibrarySession() {
  useRoomLibraryStore.setState((s) => ({ dialog: null, review: null, session: s.session + 1 }));
}
