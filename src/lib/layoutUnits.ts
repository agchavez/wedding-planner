/**
 * Escala real del plano del salón. Los elementos se siguen guardando en píxeles del lienzo
 * (x, y, width, height); SeatingLayout.pxPerMeter dice cuántos píxeles mide un metro.
 * Los layouts anteriores no tienen escala y usan DEFAULT_PX_PER_METER: nada se reescribe
 * en la base de datos, la conversión ocurre al leer y al mostrar.
 */

// Escala por defecto: la mesa redonda nueva siempre midió 100 px de diámetro y una redonda
// estándar para 8 personas mide 1.5 m (60"), así que 100 px / 1.5 m ≈ 66.67 px por metro.
// Con esta escala el lienzo por defecto de 2000×1400 px equivale a un salón de 30 × 21 m.
export const DEFAULT_PX_PER_METER = 100 / 1.5;
export const MIN_PX_PER_METER = 10;
export const MAX_PX_PER_METER = 500;

// Versión del formato de SeatingLayout. null/1 = solo píxeles; 2 = escala + capa salón (roomFixtures).
export const LAYOUT_SCHEMA_VERSION = 2;

/** Escala efectiva de un layout: la guardada si es válida, si no la de por defecto. */
export function resolvePxPerMeter(pxPerMeter: number | null | undefined): number {
  return sanitizePxPerMeter(pxPerMeter) ?? DEFAULT_PX_PER_METER;
}

/** Valida una escala recibida del cliente; null si no es un número razonable. */
export function sanitizePxPerMeter(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < MIN_PX_PER_METER || value > MAX_PX_PER_METER) return null;
  return value;
}

export function pxToMeters(px: number, pxPerMeter = DEFAULT_PX_PER_METER): number {
  return px / pxPerMeter;
}

export function metersToPx(meters: number, pxPerMeter = DEFAULT_PX_PER_METER): number {
  return meters * pxPerMeter;
}

/** Redondea metros a `digits` decimales (para mostrar en inputs sin ruido de punto flotante). */
export function roundMeters(meters: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(meters * factor) / factor;
}

const formatters = new Map<number, Intl.NumberFormat>();

function numberFormat(digits: number) {
  let nf = formatters.get(digits);
  if (!nf) {
    // es-HN, como el resto de la app: punto decimal ("1.50 m").
    nf = new Intl.NumberFormat("es-HN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
    formatters.set(digits, nf);
  }
  return nf;
}

/** "1.50 m" (es-HN). `digits` decimales fijos. */
export function formatMeters(meters: number, digits = 2): string {
  if (!Number.isFinite(meters)) return "—";
  return `${numberFormat(digits).format(meters)} m`;
}

/** "30.0 × 21.0 m" — ancho × alto en metros. */
export function formatDimensions(widthMeters: number, heightMeters: number, digits = 1): string {
  if (!Number.isFinite(widthMeters) || !Number.isFinite(heightMeters)) return "—";
  const nf = numberFormat(digits);
  return `${nf.format(widthMeters)} × ${nf.format(heightMeters)} m`;
}

const SCALE_BAR_STEPS = [0.5, 1, 2, 5, 10, 20, 50, 100];

/**
 * Largo (en metros) de la barra de escala del lienzo: el paso "redondo" más grande que
 * cabe en `maxScreenPx` píxeles de pantalla. `screenPxPerMeter` = pxPerMeter × zoom.
 */
export function pickScaleBarMeters(screenPxPerMeter: number, maxScreenPx = 140): number {
  let best = SCALE_BAR_STEPS[0];
  for (const step of SCALE_BAR_STEPS) {
    if (step * screenPxPerMeter <= maxScreenPx) best = step;
  }
  return best;
}

/**
 * Límites en metros de un input numérico con `step`, alineados a múltiplos del paso. El
 * navegador cuenta los pasos desde `min`, así que un mínimo como 0.03 haría inválidos 0.9 o 1.5
 * y las flechas saltarían a 0.93, 0.98... El límite real en píxeles lo aplica quien guarda.
 */
export function stepAlignedBounds(minPx: number, maxPx: number, pxPerMeter: number, step: number) {
  // roundMeters(…, 6) evita que el ruido de punto flotante (0.3 / 0.05 = 5.999…) mueva el límite.
  const min = Math.ceil(roundMeters(pxToMeters(minPx, pxPerMeter) / step, 6)) * step;
  const max = Math.floor(roundMeters(pxToMeters(maxPx, pxPerMeter) / step, 6)) * step;
  return { min: roundMeters(min, 4), max: roundMeters(max, 4) };
}

/** Metros escritos → píxeles dentro de [minPx, maxPx]; `clamped` indica si hubo que ajustarlos. */
export function clampMetersToPx(meters: number, pxPerMeter: number, minPx: number, maxPx: number) {
  const raw = metersToPx(meters, pxPerMeter);
  const px = Math.min(maxPx, Math.max(minPx, raw));
  return { px, clamped: px !== raw };
}
