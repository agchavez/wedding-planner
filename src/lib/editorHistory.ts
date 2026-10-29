/**
 * Historial de deshacer/rehacer del editor (pila de estados completos; los estados son
 * inmutables, así que guardar uno solo copia referencias). Los cambios continuos con la misma
 * `key` (arrastrar un vértice, escribir en un campo, mover con flechas) se agrupan en un solo
 * paso mientras sigan llegando con menos de COALESCE_MS entre uno y otro.
 */

export const HISTORY_LIMIT = 100;
export const COALESCE_MS = 1000;

export type History<T> = {
  past: T[];
  future: T[];
  lastKey: string | null;
  lastAt: number;
};

export function emptyHistory<T>(): History<T> {
  return { past: [], future: [], lastKey: null, lastAt: 0 };
}

/** Guarda `before` (el estado antes del cambio) como un paso; borra lo que había para rehacer. */
export function recordHistory<T>(
  history: History<T>,
  before: T,
  { key, now = Date.now(), limit = HISTORY_LIMIT }: { key?: string; now?: number; limit?: number } = {}
): History<T> {
  if (key && key === history.lastKey && now - history.lastAt < COALESCE_MS) {
    return { ...history, future: [], lastAt: now };
  }
  return { past: [...history.past, before].slice(-limit), future: [], lastKey: key ?? null, lastAt: now };
}

/** Corta la agrupación: el próximo cambio será un paso nuevo aunque tenga la misma key. */
export function breakHistoryGroup<T>(history: History<T>): History<T> {
  return history.lastKey === null ? history : { ...history, lastKey: null };
}

export function undoHistory<T>(history: History<T>, current: T): { history: History<T>; state: T } | null {
  const state = history.past[history.past.length - 1];
  if (state === undefined) return null;
  return {
    state,
    history: { past: history.past.slice(0, -1), future: [current, ...history.future], lastKey: null, lastAt: 0 },
  };
}

export function redoHistory<T>(history: History<T>, current: T): { history: History<T>; state: T } | null {
  const [state, ...future] = history.future;
  if (state === undefined) return null;
  return { state, history: { past: [...history.past, current], future, lastKey: null, lastAt: 0 } };
}
