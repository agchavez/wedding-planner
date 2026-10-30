import type { RoomFixture } from "@/generated/prisma";
import { DEFAULT_PX_PER_METER, metersToPx } from "@/lib/layoutUnits";

/**
 * Elementos fijos del salón (capa base, SeatingLayout.roomFixtures): no pertenecen a la boda
 * sino al local, y solo se editan en el modo "Editar salón". Preparan las plantillas por lugar.
 */
export type FixtureType = "wall" | "column" | "column-round" | "door" | "window" | "emergency-exit" | "bar";

export const FIXTURE_TYPES: FixtureType[] = ["wall", "column", "column-round", "door", "window", "emergency-exit", "bar"];

export const FIXTURE_LABELS: Record<FixtureType, string> = {
  wall: "Pared",
  column: "Columna cuadrada",
  "column-round": "Columna redonda",
  door: "Puerta",
  window: "Ventana",
  "emergency-exit": "Salida de emergencia",
  bar: "Bar fijo",
};

// Medidas por defecto en metros (ancho × alto). Pared/puerta/ventana: largo × grosor.
const DEFAULT_FIXTURE_METERS: Record<FixtureType, { width: number; height: number }> = {
  wall: { width: 4, height: 0.2 },
  column: { width: 0.5, height: 0.5 },
  "column-round": { width: 0.5, height: 0.5 },
  door: { width: 0.9, height: 0.15 },
  window: { width: 1.5, height: 0.15 },
  "emergency-exit": { width: 1.2, height: 0.2 },
  bar: { width: 3, height: 0.8 },
};

export function isFixtureType(type: unknown): type is FixtureType {
  return FIXTURE_TYPES.includes(type as FixtureType);
}

/**
 * Tamaño por defecto de un elemento fijo, en píxeles del lienzo según la escala del layout.
 * Sin redondear a píxel entero (x/y/width/height son Float) para que vuelva a los mismos metros.
 */
export function getDefaultFixtureSize(type: FixtureType, pxPerMeter = DEFAULT_PX_PER_METER) {
  const meters = DEFAULT_FIXTURE_METERS[type];
  return { width: metersToPx(meters.width, pxPerMeter), height: metersToPx(meters.height, pxPerMeter) };
}

export const MAX_ROOM_FIXTURES = 200;
// Límites en píxeles del lienzo: una pared puede ser tan larga como el lienzo (máx. 4000)
// y tan delgada como unos centímetros.
const MIN_FIXTURE_SIZE = 2;
const MAX_FIXTURE_SIZE = 4000;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finiteOr(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function sanitizeRoomFixture(raw: unknown): RoomFixture | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Partial<RoomFixture>;
  if (typeof f.id !== "string" || !f.id || f.id.length > 64 || !isFixtureType(f.type)) return null;

  return {
    id: f.id,
    type: f.type,
    label: String(f.label ?? "").slice(0, 60),
    x: clamp(finiteOr(f.x, 0), -2000, 6000),
    y: clamp(finiteOr(f.y, 0), -2000, 6000),
    width: clamp(finiteOr(f.width, MIN_FIXTURE_SIZE), MIN_FIXTURE_SIZE, MAX_FIXTURE_SIZE),
    height: clamp(finiteOr(f.height, MIN_FIXTURE_SIZE), MIN_FIXTURE_SIZE, MAX_FIXTURE_SIZE),
    rotation: finiteOr(f.rotation, 0) % 360,
  };
}

/** Lista de elementos fijos válida: descarta tipos desconocidos e ids repetidos, máx. MAX_ROOM_FIXTURES. */
export function sanitizeRoomFixtures(raw: unknown): RoomFixture[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: RoomFixture[] = [];
  for (const item of raw) {
    const fixture = sanitizeRoomFixture(item);
    if (!fixture || seen.has(fixture.id)) continue;
    seen.add(fixture.id);
    result.push(fixture);
    if (result.length >= MAX_ROOM_FIXTURES) break;
  }
  return result;
}
