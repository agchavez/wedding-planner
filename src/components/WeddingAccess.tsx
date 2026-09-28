"use client";

import { createContext, useContext, type ReactNode } from "react";

type WeddingAccess = { canEdit: boolean; canManage: boolean };

// Fuera de una boda (consola de admin, cuenta) no hay restricciones de rol.
const WeddingAccessContext = createContext<WeddingAccess>({ canEdit: true, canManage: true });

export function WeddingAccessProvider({ value, children }: { value: WeddingAccess; children: ReactNode }) {
  return <WeddingAccessContext.Provider value={value}>{children}</WeddingAccessContext.Provider>;
}

/** Permisos del usuario en la boda activa, para ocultar controles que el servidor rechazaría. */
export function useWeddingAccess() {
  return useContext(WeddingAccessContext);
}
