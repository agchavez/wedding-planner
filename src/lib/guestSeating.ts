/**
 * Lógica pura para sentar invitados en las sillas de una mesa (sin servidor ni React): la usan
 * el editor de distribución, sus server actions y las pruebas.
 *
 * Modelo: Guest.tableElementId es la mesa y Guest.seatIndex la silla donde empieza su grupo
 * (el invitado y sus acompañantes, en sillas consecutivas). seatIndex es opcional: los
 * invitados asignados sin silla (desde /invitados, el MCP o datos anteriores) se acomodan al
 * mostrarse en la primera silla libre, sin reescribir nada en la base de datos.
 */
import { computeSeatPositions, getChairMetrics, getElementFootprint, isTableType, type SeatPoint } from "@/lib/seatGeometry";
import { DEFAULT_PX_PER_METER } from "@/lib/layoutUnits";

export type SeatableGuest = { id: string; plusOnes: number; seatIndex: number | null };

/** Lo que el editor de distribución necesita de cada invitado. */
export type SeatingGuest = SeatableGuest & {
  fullName: string;
  plusOneNames: string[];
  side: string;
  group: string;
  labelIds: string[];
  rsvpStatus: string;
  tableElementId: string | null;
};

/** Cambio de mesa/silla de un invitado tal como lo guardó el servidor. */
export type GuestSeatUpdate = { id: string; tableElementId: string | null; seatIndex: number | null };

/**
 * Orden de los invitados de una mesa al acomodarlos (resolveTableSeats): el mismo en el
 * servidor y en el editor para que ambos vean las mismas sillas. Usar con Prisma `orderBy`.
 */
export const SEATING_GUEST_ORDER = [{ fullName: "asc" as const }, { id: "asc" as const }];

/** Personas que ocupa un invitado: él más sus acompañantes. */
export function partySize(guest: { plusOnes: number }) {
  return 1 + Math.max(0, Math.floor(guest.plusOnes || 0));
}

/** Silla ocupada: de quién es y si es el titular (0) o su acompañante n (1, 2...). */
export type SeatOccupant = { guestId: string; companion: number };

export type TableSeating = {
  seats: (SeatOccupant | null)[];
  /** Invitados que ya no caben en la mesa (p. ej. se le bajó la capacidad). */
  overflow: string[];
  /** Primera silla de cada invitado sentado. */
  starts: Record<string, number>;
};

function seatCount(capacity: number | null | undefined) {
  return Math.max(0, Math.floor(capacity ?? 0));
}

/** Índices de sillas de un bloque consecutivo; en una mesa se da la vuelta (la última y la primera son vecinas). */
function blockIndices(start: number, size: number, capacity: number): number[] | null {
  if (size > capacity || start < 0 || start >= capacity) return null;
  return Array.from({ length: size }, (_, i) => (start + i) % capacity);
}

function isFree(seats: (SeatOccupant | null)[], indices: number[]) {
  return indices.every((i) => seats[i] === null);
}

/**
 * Primera silla de un bloque libre de `size` sillas consecutivas. Con `preferred` (soltar sobre
 * una silla concreta) se prueba antes un bloque que incluya esa silla, empezando por ella.
 */
export function findFreeBlock(seats: (SeatOccupant | null)[], size: number, preferred?: number | null): number | null {
  const capacity = seats.length;
  if (size <= 0 || size > capacity) return null;
  const candidates: number[] = [];
  if (preferred != null && preferred >= 0 && preferred < capacity) {
    for (let back = 0; back < size; back++) candidates.push((preferred - back + capacity) % capacity);
  }
  for (let start = 0; start < capacity; start++) candidates.push(start);
  for (const start of candidates) {
    const block = blockIndices(start, size, capacity);
    if (block && isFree(seats, block)) return start;
  }
  return null;
}

/**
 * Reparte las sillas de una mesa. Primero los invitados con silla guardada (si su bloque cabe
 * y no choca); después el resto, en orden, en el primer bloque libre. Si ya no hay un bloque
 * junto pero sí sillas sueltas, se sientan separados para que nadie desaparezca del plano;
 * si no hay sillas, quedan en `overflow`.
 */
export function resolveTableSeats(capacity: number | null | undefined, guests: SeatableGuest[]): TableSeating {
  const total = seatCount(capacity);
  const seats: (SeatOccupant | null)[] = Array.from({ length: total }, () => null);
  const starts: Record<string, number> = {};
  const overflow: string[] = [];
  const placed = new Set<string>();

  const place = (guest: SeatableGuest, indices: number[]) => {
    indices.forEach((seat, companion) => (seats[seat] = { guestId: guest.id, companion }));
    starts[guest.id] = indices[0];
    placed.add(guest.id);
  };

  const fixed = guests
    .filter((g) => Number.isInteger(g.seatIndex) && (g.seatIndex as number) >= 0 && (g.seatIndex as number) < total)
    .sort((a, b) => (a.seatIndex as number) - (b.seatIndex as number));
  for (const guest of fixed) {
    const block = blockIndices(guest.seatIndex as number, partySize(guest), total);
    if (block && isFree(seats, block)) place(guest, block);
  }

  for (const guest of guests) {
    if (placed.has(guest.id)) continue;
    const size = partySize(guest);
    const start = findFreeBlock(seats, size);
    if (start !== null) {
      place(guest, blockIndices(start, size, total)!);
      continue;
    }
    const free = seats.flatMap((s, i) => (s === null ? [i] : []));
    if (free.length >= size) place(guest, free.slice(0, size));
    else overflow.push(guest.id);
  }

  return { seats, overflow, starts };
}

export type SeatPlan =
  | { ok: true; seatIndex: number; /** Otros invitados de la mesa que se recorrieron para dejar el grupo junto. */ moved: { id: string; seatIndex: number }[] }
  | { ok: false; reason: "full"; free: number }
  /** Se eligió una silla concreta y ya es de otro invitado: no se le busca otra a escondidas. */
  | { ok: false; reason: "seat-taken"; seatIndex: number };

/**
 * Dónde sentar a un invitado (con sus acompañantes) en una mesa que ya tiene a `others`.
 * Respeta la capacidad (personas, contando acompañantes). Si se soltó sobre una silla ocupada
 * por otro, no lo sienta en otra silla. Si hay lugar pero no sillas juntas, reacomoda la mesa
 * en orden para dejar al grupo en sillas consecutivas.
 */
export function planSeat(
  capacity: number | null | undefined,
  others: SeatableGuest[],
  guest: { plusOnes: number },
  targetSeat?: number | null
): SeatPlan {
  const total = seatCount(capacity);
  const size = partySize(guest);
  const taken = others.reduce((n, g) => n + partySize(g), 0);
  if (taken + size > total) return { ok: false, reason: "full", free: Math.max(0, total - taken) };

  const { seats, starts } = resolveTableSeats(total, others);
  if (targetSeat != null && targetSeat >= 0 && targetSeat < total && seats[targetSeat] !== null) {
    return { ok: false, reason: "seat-taken", seatIndex: targetSeat };
  }
  const start = findFreeBlock(seats, size, targetSeat);
  if (start !== null) return { ok: true, seatIndex: start, moved: [] };

  // Sin bloque libre: todos juntos desde la silla 0, en el orden en que ya estaban.
  const ordered = [...others].sort((a, b) => (starts[a.id] ?? 0) - (starts[b.id] ?? 0));
  const moved: { id: string; seatIndex: number }[] = [];
  let next = 0;
  for (const other of ordered) {
    if (other.seatIndex !== next) moved.push({ id: other.id, seatIndex: next });
    next += partySize(other);
  }
  return { ok: true, seatIndex: next, moved };
}

/**
 * El invitado ya está en esa mesa y en esa silla (o se soltó sobre la mesa donde ya está):
 * no hay nada que guardar. `tableGuests` son todos los de la mesa, incluido él.
 */
export function isSameSeat(
  capacity: number | null | undefined,
  tableGuests: SeatableGuest[],
  guestId: string,
  seatIndex: number | null
) {
  if (!tableGuests.some((g) => g.id === guestId)) return false;
  if (seatIndex === null) return true;
  return resolveTableSeats(capacity, tableGuests).seats[seatIndex]?.guestId === guestId;
}

/** Aviso cuando planSeat no puede sentar al invitado. */
export function seatPlanMessage(
  tableName: string,
  guest: { fullName: string; plusOnes: number },
  plan: Extract<SeatPlan, { ok: false }>
) {
  if (plan.reason === "seat-taken") {
    return `La silla ${plan.seatIndex + 1} de ${tableName || "la mesa"} ya está ocupada. Suelta a ${guest.fullName} en una silla libre o sobre la mesa.`;
  }
  return noRoomMessage(tableName, guest, plan.free);
}

/** Aviso cuando un invitado (con sus acompañantes) no cabe en una mesa. */
export function noRoomMessage(tableName: string, guest: { fullName: string; plusOnes: number }, free: number) {
  const size = partySize(guest);
  const needs = size > 1 ? `viene con ${size} personas` : "necesita 1 silla";
  const left = free === 0 ? "ya no quedan sillas libres" : free === 1 ? "solo queda 1 libre" : `solo quedan ${free} libres`;
  return `${tableName || "La mesa"} no tiene lugar: ${guest.fullName} ${needs} y ${left}.`;
}

/** Puntos de silla de una mesa (relativos a su centro, sin rotar) y el radio con que se dibujan. */
export function tableSeatLayout(
  element: { type: string; width: number; height: number; capacity: number | null },
  pxPerMeter = DEFAULT_PX_PER_METER
): { points: SeatPoint[]; chairRadius: number } {
  const chair = getChairMetrics(pxPerMeter);
  const capacity = seatCount(element.capacity);
  if (element.type === "table-round") {
    return { points: computeSeatPositions("table-round", element.width, element.height, capacity, chair.offset), chairRadius: chair.radius };
  }
  // En mesas largas con muchas sillas, que no se encimen entre sí.
  const perSide = Math.ceil(capacity / 2);
  const chairRadius = perSide > 0 ? Math.min(chair.radius, (element.width / (perSide + 1)) * 0.46) : chair.radius;
  return {
    points: computeSeatPositions("table-rectangular", element.width, element.height, capacity, chair.offset),
    chairRadius,
  };
}

/** Posición de una silla en el lienzo (aplica la posición y la rotación de la mesa). */
export function seatWorldPosition(
  element: { type: string; x: number; y: number; width: number; height: number; rotation: number; capacity: number | null },
  seatIndex: number,
  pxPerMeter = DEFAULT_PX_PER_METER
): { x: number; y: number; radius: number } | null {
  const { points, chairRadius } = tableSeatLayout(element, pxPerMeter);
  const p = points[seatIndex];
  if (!p) return null;
  const angle = (element.rotation * Math.PI) / 180;
  return {
    x: element.x + p.x * Math.cos(angle) - p.y * Math.sin(angle),
    y: element.y + p.x * Math.sin(angle) + p.y * Math.cos(angle),
    radius: chairRadius,
  };
}

type HitElement = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  capacity: number | null;
  zIndex?: number;
};

/**
 * Mesa (y silla, si cae sobre una) bajo un punto del lienzo. Sirve para soltar un invitado:
 * sobre una silla la usa; sobre la mesa usa la primera libre (seatIndex null).
 */
export function findSeatAt(
  elements: HitElement[],
  point: { x: number; y: number },
  pxPerMeter = DEFAULT_PX_PER_METER
): { tableId: string; seatIndex: number | null } | null {
  // De arriba hacia abajo: gana la mesa dibujada encima.
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (!isTableType(el.type)) continue;
    const angle = (-el.rotation * Math.PI) / 180;
    const dx = point.x - el.x;
    const dy = point.y - el.y;
    const local = { x: dx * Math.cos(angle) - dy * Math.sin(angle), y: dx * Math.sin(angle) + dy * Math.cos(angle) };

    const { points, chairRadius } = tableSeatLayout(el, pxPerMeter);
    let bestIndex: number | null = null;
    let bestDist = chairRadius * 1.25;
    for (const [index, p] of points.entries()) {
      const dist = Math.hypot(local.x - p.x, local.y - p.y);
      if (dist <= bestDist) {
        bestIndex = index;
        bestDist = dist;
      }
    }
    if (bestIndex !== null) return { tableId: el.id, seatIndex: bestIndex };

    const footprint = getElementFootprint(el, pxPerMeter);
    const inside = footprint.round
      ? Math.hypot(local.x, local.y) <= footprint.width / 2
      : Math.abs(local.x) <= footprint.width / 2 && Math.abs(local.y) <= footprint.height / 2;
    if (inside) return { tableId: el.id, seatIndex: null };
  }
  return null;
}

/** Texto sin tildes ni mayúsculas, para buscar "garcia" y encontrar "García". */
export function normalizeSearchText(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/**
 * Búsqueda de invitados: cada palabra debe aparecer en el nombre, en sus acompañantes o en su
 * grupo, en cualquier orden ("lopez maria" encuentra a "María José López García").
 */
export function matchesGuestSearch(
  guest: { fullName: string; plusOneNames?: string[]; group?: string },
  query: string
) {
  const words = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeSearchText([guest.fullName, ...(guest.plusOneNames ?? []), guest.group ?? ""].join(" "));
  return words.every((word) => haystack.includes(word));
}

/**
 * Iniciales para la silla: nombre y primer apellido. Con dos apellidos ("María López García")
 * es la segunda palabra; con nombre compuesto y dos apellidos (4+ palabras), la penúltima.
 */
export function guestInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const surname = parts.length >= 4 ? parts[parts.length - 2] : (parts[1] ?? "");
  return (parts[0][0] + (surname[0] ?? "")).toUpperCase();
}

/** Colorear las sillas por lado (novia/novio/ambos) o por grupo ("Familia", "Trabajo"...). */
export type SeatColorMode = "side" | "group";

/** Cuántos colores de grupo hay (tokens --plan-g1 … --plan-g6 en globals.css). */
export const SEAT_COLOR_SLOTS = 6;

const SIDE_SLOT: Record<string, number> = { bride: 0, groom: 3, both: 2 };

/**
 * Color de un invitado: índice 0..SEAT_COLOR_SLOTS-1, o null (neutro) si no tiene lado/grupo.
 * Por grupo, el color sale del orden alfabético de los grupos de la boda (estable entre visitas).
 */
export function seatColorSlot(guest: { side: string; group: string }, mode: SeatColorMode, groups: string[]): number | null {
  if (mode === "side") return SIDE_SLOT[guest.side] ?? null;
  const index = guest.group ? groups.indexOf(guest.group) : -1;
  return index >= 0 ? index % SEAT_COLOR_SLOTS : null;
}

/** Grupos distintos de los invitados, en orden alfabético (para seatColorSlot). */
export function sortedGroups(guests: { group: string }[]) {
  return [...new Set(guests.map((g) => g.group).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}
