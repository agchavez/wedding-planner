const WEDDING_TZ = "America/Tegucigalpa";

/**
 * Los campos "solo fecha" (weddingDate, dueDate, BudgetContribution.date) se guardan como
 * medianoche UTC del día elegido. Comparar/derivar el día a partir de este string evita el
 * corrimiento de un día que produce comparar instantes reales en una zona horaria distinta.
 */
export function dateOnlyStr(date: Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

/** "Hoy" como YYYY-MM-DD en la zona horaria de la boda, para comparar contra dateOnlyStr(). */
export function todayStrWeddingTz(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: WEDDING_TZ }).format(new Date());
}
