import type { LayoutElement, PlanImage, RoomFixture } from "@/generated/prisma";
import {
  clampCanvasSize,
  formatMeters,
  MAX_CANVAS_SIZE,
  MAX_PX_PER_METER,
  MAX_ROOM_COORD,
  metersToPx,
  MIN_PX_PER_METER,
  MIN_ROOM_COORD,
  pxToMeters,
  resolvePxPerMeter,
} from "@/lib/layoutUnits";
import { FIXTURE_LABELS, isFixtureType, MAX_FIXTURE_SIZE } from "@/lib/roomFixtures";
import { getElementFootprint, isChairBlock, isTableType, type RoomPoint } from "@/lib/seatGeometry";

/**
 * Biblioteca de salones (lógica pura): la "capa salón" de un layout (contorno, elementos fijos,
 * escala, lienzo y plano de fondo) se guarda como versión inmutable de un VenueRoom y se copia a
 * otros layouts. Aquí van la conversión de escala, la calibración por dos puntos, la validación
 * de choques al cambiar de versión y el aviso de aforo.
 */

export type VenueVisibility = "private" | "platform";

export function parseVisibility(value: unknown): VenueVisibility {
  return value === "platform" ? "platform" : "private";
}

/** Capa salón completa, tal como se guarda en VenueRoomVersion y se copia a un SeatingLayout. */
export type RoomLayer = {
  roomShape: RoomPoint[];
  roomFixtures: RoomFixture[];
  pxPerMeter: number;
  canvasWidth: number;
  canvasHeight: number;
  background: "indoor" | "garden";
  backgroundImage: PlanImage | null;
};

export type RoomVersionData = RoomLayer & { id: string; roomId: string; version: number; createdAt: string };

export type LibraryRoom = {
  id: string;
  name: string;
  banquetCapacity: number | null;
  cocktailCapacity: number | null;
  theaterCapacity: number | null;
  venue: { id: string; name: string; city: string; address: string; visibility: VenueVisibility };
  /** El usuario puede guardarle versiones nuevas. */
  editable: boolean;
  /** Última versión (vista previa); null si el salón todavía no tiene ninguna. */
  latest: RoomVersionData | null;
  sizeMeters: { width: number; height: number } | null;
};

/** Salón de la biblioteca en el que se basa un layout, y si hay una versión más nueva. */
export type BaseRoomInfo = {
  versionId: string;
  version: number;
  roomId: string;
  roomName: string;
  venueName: string;
  banquetCapacity: number | null;
  latestVersionId: string;
  latestVersion: number;
};

/** ¿La capa tiene algo que valga la pena guardar en la biblioteca? */
export function hasRoomContent(layer: Pick<RoomLayer, "roomShape" | "roomFixtures" | "backgroundImage">) {
  return layer.roomShape.length >= 3 || layer.roomFixtures.length > 0 || !!layer.backgroundImage;
}

// ---------------------------------------------------------------------------------------------
// Plano de fondo
// ---------------------------------------------------------------------------------------------

export const FLOOR_PLAN_UPLOAD_PREFIX = "/api/uploads/floorplans/";
export const DEFAULT_PLAN_OPACITY = 0.5;
const MIN_PLAN_OPACITY = 0.1;
const MAX_PLAN_SIZE = 20000;

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// /api/uploads/floorplans/<boda>/<archivo>: lo único que se acepta como plano.
const PLAN_UPLOAD_URL = /^\/api\/uploads\/floorplans\/([a-f0-9]{24})\/[^/\\?#\s]+$/i;

/**
 * URL aceptada para un plano: solo una subida de la app (uploads/floorplans/<boda>/…). Nunca
 * enlaces externos: el plano se dibuja en el navegador de otras personas (colaboradores, quien
 * abre la biblioteca, administradores) y un host ajeno recibiría sus visitas.
 */
export function isAllowedPlanUrl(url: unknown): url is string {
  if (typeof url !== "string" || url.length > 2000 || url.includes("..")) return false;
  return PLAN_UPLOAD_URL.test(url);
}

/** Boda que subió el plano (segmento <boda> de la URL), o null si la URL no es un plano válido. */
export function planUploadWeddingId(url: unknown): string | null {
  if (!isAllowedPlanUrl(url)) return null;
  return PLAN_UPLOAD_URL.exec(url)?.[1].toLowerCase() ?? null;
}

/** Valida el plano recibido del cliente; null si no sirve (se guarda como "sin plano"). */
export function sanitizePlanImage(raw: unknown): PlanImage | null {
  if (!raw || typeof raw !== "object") return null;
  const img = raw as Partial<PlanImage>;
  if (!isAllowedPlanUrl(img.url) || !finite(img.width) || !finite(img.height)) return null;
  if (img.width <= 0 || img.height <= 0) return null;
  return {
    url: img.url,
    x: clamp(finite(img.x) ? img.x : 0, MIN_ROOM_COORD, MAX_ROOM_COORD),
    y: clamp(finite(img.y) ? img.y : 0, MIN_ROOM_COORD, MAX_ROOM_COORD),
    width: Math.min(img.width, MAX_PLAN_SIZE),
    height: Math.min(img.height, MAX_PLAN_SIZE),
    opacity: clamp(finite(img.opacity) ? img.opacity : DEFAULT_PLAN_OPACITY, MIN_PLAN_OPACITY, 1),
  };
}

/** Plano de `naturalWidth × naturalHeight` encajado y centrado en el lienzo (sin deformarlo). */
export function fitPlanImage(url: string, naturalWidth: number, naturalHeight: number, canvasWidth: number, canvasHeight: number): PlanImage {
  const scale = Math.min(canvasWidth / naturalWidth, canvasHeight / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return { url, x: (canvasWidth - width) / 2, y: (canvasHeight - height) / 2, width, height, opacity: DEFAULT_PLAN_OPACITY };
}

// ---------------------------------------------------------------------------------------------
// Escala
// ---------------------------------------------------------------------------------------------

/**
 * La capa salón convertida a otra escala (px por metro), conservando las medidas reales: así se
 * copia un salón de la biblioteca a un layout sin tocar las mesas de la boda, que siguen en la
 * escala del layout. El lienzo se ajusta a los límites del servidor.
 */
export function scaleRoomLayer(layer: RoomLayer, targetPxPerMeter: number): RoomLayer {
  const factor = targetPxPerMeter / layer.pxPerMeter;
  if (!Number.isFinite(factor) || factor <= 0 || Math.abs(factor - 1) < 1e-9) return { ...layer, pxPerMeter: targetPxPerMeter };
  const point = (p: RoomPoint) => ({ x: p.x * factor, y: p.y * factor });
  return {
    ...layer,
    pxPerMeter: targetPxPerMeter,
    roomShape: layer.roomShape.map(point),
    roomFixtures: layer.roomFixtures.map((f) => ({
      ...f,
      x: f.x * factor,
      y: f.y * factor,
      width: f.width * factor,
      height: f.height * factor,
    })),
    canvasWidth: Math.round(clampCanvasSize(layer.canvasWidth * factor)),
    canvasHeight: Math.round(clampCanvasSize(layer.canvasHeight * factor)),
    backgroundImage: layer.backgroundImage && {
      ...layer.backgroundImage,
      x: layer.backgroundImage.x * factor,
      y: layer.backgroundImage.y * factor,
      width: layer.backgroundImage.width * factor,
      height: layer.backgroundImage.height * factor,
    },
  };
}

/**
 * ¿La capa cabe en los límites del servidor al convertirla a `targetPxPerMeter`? Si el contorno o
 * los elementos fijos se salen de las coordenadas permitidas, una pared pasa del tamaño máximo o
 * el salón ya no cabe en el lienzo más grande, el autoguardado lo recortaría y deformaría el
 * salón (con otras medidas que las revisadas). null si cabe; si no, por qué.
 */
export function scaledRoomLayerIssue(layer: RoomLayer, targetPxPerMeter: number): string | null {
  const factor = targetPxPerMeter / layer.pxPerMeter;
  if (!Number.isFinite(factor) || factor <= 0) return "La escala del salón no es válida.";
  const inRange = (v: number) => v * factor >= MIN_ROOM_COORD && v * factor <= MAX_ROOM_COORD;
  const points = [...layer.roomShape, ...layer.roomFixtures];
  // Si el lienzo convertido pasa del máximo, se recorta: el contorno y los fijos deben seguir dentro.
  const canvasCut = Math.max(layer.canvasWidth, layer.canvasHeight) * factor > MAX_CANVAS_SIZE + 0.5;
  const fits =
    points.every((p) => inRange(p.x) && inRange(p.y)) &&
    layer.roomFixtures.every((f) => f.width * factor <= MAX_FIXTURE_SIZE && f.height * factor <= MAX_FIXTURE_SIZE) &&
    (!canvasCut || points.every((p) => p.x * factor <= MAX_CANVAS_SIZE && p.y * factor <= MAX_CANVAS_SIZE));
  if (fits) return null;
  return (
    `Este salón no cabe a la escala de este plano (${Math.round(targetPxPerMeter)} px por metro): al guardarlo se ` +
    "recortaría y cambiaría de forma. Calibra este plano a una escala menor antes de usarlo."
  );
}

// Distancia mínima (px del lienzo) entre los dos puntos de calibración: con menos, el error de
// un clic se vuelve enorme.
export const MIN_CALIBRATION_PX = 10;

export type CalibrationResult = { ok: true; pxPerMeter: number } | { ok: false; error: string };

/**
 * Calibración por dos puntos: el usuario marca dos puntos del plano y dice cuántos metros hay
 * entre ellos. Devuelve la escala (px por metro) o por qué no se puede usar.
 */
export function calibrateScale(a: RoomPoint, b: RoomPoint, meters: number): CalibrationResult {
  if (!finite(meters) || meters <= 0) return { ok: false, error: "Escribe la distancia real en metros (mayor que 0)." };
  const distance = Math.hypot(b.x - a.x, b.y - a.y);
  if (!finite(distance) || distance < MIN_CALIBRATION_PX) {
    return { ok: false, error: "Los puntos están demasiado cerca. Marca dos puntos más separados." };
  }
  const pxPerMeter = distance / meters;
  if (pxPerMeter < MIN_PX_PER_METER || pxPerMeter > MAX_PX_PER_METER) {
    return { ok: false, error: "Esa distancia da una escala fuera de rango. Revisa los metros o acerca/aleja los puntos." };
  }
  return { ok: true, pxPerMeter };
}

// Mismos límites que sanitizeElement (lib/seatingLayout.ts).
const MIN_ELEMENT_PX = 20;
const MAX_ELEMENT_PX = 900;

/**
 * Al cambiar la escala del layout (calibración), las mesas y zonas conservan su tamaño real:
 * se redimensionan de `fromPxPerMeter` a `toPxPerMeter`. Las posiciones no cambian (siguen sobre
 * el mismo punto del plano).
 */
export function rescaleElementSizes(elements: LayoutElement[], fromPxPerMeter: number, toPxPerMeter: number): LayoutElement[] {
  const factor = toPxPerMeter / fromPxPerMeter;
  if (!Number.isFinite(factor) || factor <= 0 || Math.abs(factor - 1) < 1e-9) return elements;
  return elements.map((el) => ({
    ...el,
    width: clamp(el.width * factor, MIN_ELEMENT_PX, MAX_ELEMENT_PX),
    height: clamp(el.height * factor, MIN_ELEMENT_PX, MAX_ELEMENT_PX),
  }));
}

// ---------------------------------------------------------------------------------------------
// Choques al cambiar de versión del salón
// ---------------------------------------------------------------------------------------------

type Pt = RoomPoint;

// Elementos fijos que una mesa no puede pisar, y los que no debe tapar (puertas y salidas).
const OBSTACLE_FIXTURES = new Set(["wall", "column", "column-round", "bar"]);
const EXIT_FIXTURES = new Set(["door", "emergency-exit"]);
// Espacio libre que se pide delante y detrás de una puerta o salida.
export const EXIT_CLEARANCE_METERS = 1;
// Un roce de menos de 1 cm no cuenta como choque (redondeos, mesas pegadas a la pared).
const TOLERANCE_METERS = 0.01;
const CIRCLE_SEGMENTS = 24;

function rectCorners(cx: number, cy: number, width: number, height: number, rotation: number): Pt[] {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = width / 2;
  const hh = height / 2;
  return [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ].map(([dx, dy]) => ({ x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos }));
}

function circlePoints(cx: number, cy: number, radius: number): Pt[] {
  return Array.from({ length: CIRCLE_SEGMENTS }, (_, i) => {
    const a = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  });
}

/** Contorno (polígono convexo) de la huella real de un elemento de la boda: mesa + sillas. */
export function elementOutline(el: LayoutElement, pxPerMeter: number): Pt[] {
  const fp = getElementFootprint(el, pxPerMeter);
  return fp.round
    ? circlePoints(el.x, el.y, Math.max(fp.width, fp.height) / 2)
    : rectCorners(el.x, el.y, fp.width, fp.height, el.rotation);
}

function fixtureOutline(f: RoomFixture, extraHeight = 0): Pt[] {
  return f.type === "column-round"
    ? circlePoints(f.x, f.y, Math.max(f.width, f.height) / 2)
    : rectCorners(f.x, f.y, f.width, f.height + extraHeight, f.rotation);
}

/** Punto dentro de un polígono (simple, no necesariamente convexo), por cruce de rayos. */
export function pointInPolygon(p: Pt, polygon: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Distancia de un punto al borde del polígono (para la tolerancia de "pegado a la pared"). */
function distanceToPolygonEdge(p: Pt, polygon: Pt[]): number {
  let best = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1);
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
  }
  return best;
}

/**
 * ¿Se enciman dos polígonos convexos? (teorema del eje separador). `tolerance` = cuánto pueden
 * penetrarse sin contar como choque.
 */
export function convexPolygonsOverlap(a: Pt[], b: Pt[], tolerance = 0): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];
      const axis = { x: -(p2.y - p1.y), y: p2.x - p1.x };
      const len = Math.hypot(axis.x, axis.y);
      if (len === 0) continue;
      const project = (pts: Pt[]) => {
        let min = Infinity;
        let max = -Infinity;
        for (const p of pts) {
          const v = (p.x * axis.x + p.y * axis.y) / len;
          min = Math.min(min, v);
          max = Math.max(max, v);
        }
        return { min, max };
      };
      const pa = project(a);
      const pb = project(b);
      if (pa.max - pb.min <= tolerance || pb.max - pa.min <= tolerance) return false;
    }
  }
  return true;
}

export type RoomConflictKind = "outside" | "overlap" | "blocks-exit";

export type RoomConflict = {
  elementId: string;
  elementLabel: string;
  kind: RoomConflictKind;
  fixtureId: string | null;
  message: string;
};

function elementName(el: LayoutElement) {
  if (el.label) return el.label;
  return isChairBlock(el.type) ? "Bloque de sillas" : el.tableNumber ? `Mesa ${el.tableNumber}` : "Mesa sin nombre";
}

function fixtureName(f: RoomFixture) {
  const base = (isFixtureType(f.type) ? FIXTURE_LABELS[f.type] : "Elemento fijo").toLowerCase();
  // Todos son femeninos ("la pared", "la puerta"...) salvo el bar y el elemento genérico.
  const article = f.type === "bar" || !isFixtureType(f.type) ? "el" : "la";
  return f.label ? `${article} ${base} «${f.label}»` : `${article} ${base}`;
}

/**
 * Mesas (y bloques de sillas) que chocarían con una capa salón: quedan fuera del contorno (o del
 * lienzo, si no hay contorno), se enciman con paredes, columnas o el bar, o tapan una puerta o
 * salida de emergencia (con EXIT_CLEARANCE_METERS libres delante y detrás). La capa debe estar ya
 * en la escala de los elementos (ver scaleRoomLayer).
 */
export function findRoomConflicts(elements: LayoutElement[], layer: RoomLayer): RoomConflict[] {
  const pxPerMeter = resolvePxPerMeter(layer.pxPerMeter);
  const tolerance = metersToPx(TOLERANCE_METERS, pxPerMeter);
  const clearance = metersToPx(EXIT_CLEARANCE_METERS, pxPerMeter) * 2;
  const room: Pt[] =
    layer.roomShape.length >= 3
      ? layer.roomShape
      : [
          { x: 0, y: 0 },
          { x: layer.canvasWidth, y: 0 },
          { x: layer.canvasWidth, y: layer.canvasHeight },
          { x: 0, y: layer.canvasHeight },
        ];
  const obstacles = layer.roomFixtures.filter((f) => OBSTACLE_FIXTURES.has(f.type)).map((f) => ({ f, outline: fixtureOutline(f) }));
  const exits = layer.roomFixtures.filter((f) => EXIT_FIXTURES.has(f.type)).map((f) => ({ f, outline: fixtureOutline(f, clearance) }));

  const conflicts: RoomConflict[] = [];
  for (const el of elements) {
    if (!isTableType(el.type) && !isChairBlock(el.type)) continue;
    const outline = elementOutline(el, pxPerMeter);
    const name = elementName(el);
    const push = (kind: RoomConflictKind, fixture: RoomFixture | null, message: string) =>
      conflicts.push({ elementId: el.id, elementLabel: name, kind, fixtureId: fixture?.id ?? null, message });

    // Fuera: algún punto de la huella fuera del contorno, o una esquina del contorno (salón en L)
    // metida dentro de la huella.
    const pokesOut = outline.some((p) => !pointInPolygon(p, room) && distanceToPolygonEdge(p, room) > tolerance);
    const cornerInside = room.some((p) => pointInPolygon(p, outline) && distanceToPolygonEdge(p, outline) > tolerance);
    if (pokesOut || cornerInside) push("outside", null, "Queda fuera del salón o atraviesa una pared del contorno");

    for (const { f, outline: obstacle } of obstacles) {
      if (convexPolygonsOverlap(outline, obstacle, tolerance)) push("overlap", f, `Se encima con ${fixtureName(f)}`);
    }
    for (const { f, outline: zone } of exits) {
      if (convexPolygonsOverlap(outline, zone, tolerance)) {
        push("blocks-exit", f, `Tapa ${fixtureName(f)} (necesita ${formatMeters(EXIT_CLEARANCE_METERS, 0)} libre delante)`);
      }
    }
  }
  return conflicts;
}

// ---------------------------------------------------------------------------------------------
// Aforo
// ---------------------------------------------------------------------------------------------

/** Personas sentadas (invitado + acompañantes) en las mesas de estos elementos. */
export function seatedPeople(elements: { id: string; type: string }[], guests: { tableElementId: string | null; plusOnes: number }[]) {
  const tableIds = new Set(elements.filter((el) => isTableType(el.type)).map((el) => el.id));
  return guests.reduce((n, g) => (g.tableElementId && tableIds.has(g.tableElementId) ? n + 1 + g.plusOnes : n), 0);
}

export type CapacityStatus = { capacity: number; seated: number; over: boolean; message: string };

/**
 * Aforo del montaje banquete frente a las personas sentadas. No bloquea nada: solo avisa.
 * null si el salón no declara su capacidad.
 */
export function banquetCapacityStatus(capacity: number | null | undefined, seated: number): CapacityStatus | null {
  if (!capacity || capacity <= 0) return null;
  const over = seated > capacity;
  const message = over
    ? `Hay ${seated} personas sentadas y el aforo de banquete del salón es de ${capacity} (${seated - capacity} de más).`
    : `${seated} de ${capacity} personas (aforo de banquete).`;
  return { capacity, seated, over, message };
}

/** "30 × 21 m" de una capa (para listas y vistas previas). */
export function layerSizeMeters(layer: Pick<RoomLayer, "canvasWidth" | "canvasHeight" | "pxPerMeter" | "roomShape">) {
  const pxPerMeter = resolvePxPerMeter(layer.pxPerMeter);
  if (layer.roomShape.length >= 3) {
    const xs = layer.roomShape.map((p) => p.x);
    const ys = layer.roomShape.map((p) => p.y);
    return {
      width: pxToMeters(Math.max(...xs) - Math.min(...xs), pxPerMeter),
      height: pxToMeters(Math.max(...ys) - Math.min(...ys), pxPerMeter),
    };
  }
  return { width: pxToMeters(layer.canvasWidth, pxPerMeter), height: pxToMeters(layer.canvasHeight, pxPerMeter) };
}

/** Capacidad declarada: entero positivo o null (vacío). */
export function parseCapacity(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(100_000, Math.round(n));
}
