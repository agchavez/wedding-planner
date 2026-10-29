/**
 * Geometría pura del editor de distribución: cajas, alineación, guías inteligentes (snapping),
 * distancia al vecino más cercano y colocación sin encimar. Todo en píxeles del lienzo; cada
 * elemento está centrado en (x, y), igual que LayoutElement y RoomFixture.
 */

export type Box = { minX: number; minY: number; maxX: number; maxY: number };

/** Elemento colocado en el plano. width/height = huella real (incluye sillas en las mesas). */
export type PlacedShape = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  // Círculo (mesa redonda, columna redonda): la caja no cambia al rotar.
  round?: boolean;
};

export type Position = { id: string; x: number; y: number };

/** Caja alineada a los ejes que encierra la figura rotada. */
export function shapeBox(shape: PlacedShape): Box {
  let halfW: number;
  let halfH: number;
  if (shape.round) {
    halfW = halfH = Math.max(shape.width, shape.height) / 2;
  } else {
    const rad = (shape.rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    halfW = (shape.width * cos + shape.height * sin) / 2;
    halfH = (shape.width * sin + shape.height * cos) / 2;
  }
  return { minX: shape.x - halfW, minY: shape.y - halfH, maxX: shape.x + halfW, maxY: shape.y + halfH };
}

export function unionBox(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null;
  return boxes.reduce((acc, b) => ({
    minX: Math.min(acc.minX, b.minX),
    minY: Math.min(acc.minY, b.minY),
    maxX: Math.max(acc.maxX, b.maxX),
    maxY: Math.max(acc.maxY, b.maxY),
  }));
}

export function translateBox(box: Box, dx: number, dy: number): Box {
  return { minX: box.minX + dx, minY: box.minY + dy, maxX: box.maxX + dx, maxY: box.maxY + dy };
}

export function boxesIntersect(a: Box, b: Box, margin = 0): boolean {
  return a.minX < b.maxX + margin && a.maxX + margin > b.minX && a.minY < b.maxY + margin && a.maxY + margin > b.minY;
}

/** Caja a partir de dos esquinas cualesquiera (rectángulo de selección). */
export function boxFromPoints(a: { x: number; y: number }, b: { x: number; y: number }): Box {
  return { minX: Math.min(a.x, b.x), minY: Math.min(a.y, b.y), maxX: Math.max(a.x, b.x), maxY: Math.max(a.y, b.y) };
}

// ---------------------------------------------------------------------------------------------
// Guías inteligentes
// ---------------------------------------------------------------------------------------------

export type GuideLine = { x1: number; y1: number; x2: number; y2: number };
export type SnapResult = { dx: number; dy: number; guides: GuideLine[] };

const xAnchors = (b: Box) => [b.minX, (b.minX + b.maxX) / 2, b.maxX];
const yAnchors = (b: Box) => [b.minY, (b.minY + b.maxY) / 2, b.maxY];

function bestOffset(moving: number[], targets: Box[], anchors: (b: Box) => number[], threshold: number) {
  let best: number | null = null;
  for (const target of targets) {
    for (const t of anchors(target)) {
      for (const m of moving) {
        const diff = t - m;
        if (Math.abs(diff) <= threshold && (best === null || Math.abs(diff) < Math.abs(best))) best = diff;
      }
    }
  }
  return best;
}

/**
 * Alinea bordes y centros de `moving` con los de `targets` si están a menos de `threshold`
 * (en píxeles del lienzo: quien llama divide el umbral de pantalla entre el zoom). Devuelve el
 * ajuste a sumar y las líneas guía a dibujar.
 */
export function computeSnap(moving: Box, targets: Box[], threshold: number): SnapResult {
  const dx = bestOffset(xAnchors(moving), targets, xAnchors, threshold) ?? 0;
  const dy = bestOffset(yAnchors(moving), targets, yAnchors, threshold) ?? 0;
  const snapped = translateBox(moving, dx, dy);
  const guides: GuideLine[] = [];
  const EPS = 0.5;

  // Una línea vertical por cada x del elemento que quedó alineada con algún otro.
  for (const x of xAnchors(snapped)) {
    const matches = targets.filter((t) => xAnchors(t).some((tx) => Math.abs(tx - x) < EPS));
    if (matches.length === 0) continue;
    const ys = [snapped.minY, snapped.maxY, ...matches.flatMap((t) => [t.minY, t.maxY])];
    guides.push({ x1: x, y1: Math.min(...ys), x2: x, y2: Math.max(...ys) });
  }
  for (const y of yAnchors(snapped)) {
    const matches = targets.filter((t) => yAnchors(t).some((ty) => Math.abs(ty - y) < EPS));
    if (matches.length === 0) continue;
    const xs = [snapped.minX, snapped.maxX, ...matches.flatMap((t) => [t.minX, t.maxX])];
    guides.push({ x1: Math.min(...xs), y1: y, x2: Math.max(...xs), y2: y });
  }
  return { dx, dy, guides };
}

export type GapMeasure = GuideLine & { distance: number };

/**
 * Hueco libre hasta el vecino más cercano en horizontal o vertical (solo vecinos que se
 * enfrentan: sus cajas se solapan en el otro eje). null si no hay ninguno a menos de `maxDistance`.
 */
export function nearestGap(moving: Box, targets: Box[], maxDistance = Infinity): GapMeasure | null {
  let best: GapMeasure | null = null;
  const consider = (gap: GapMeasure) => {
    if (gap.distance >= 0 && gap.distance <= maxDistance && (!best || gap.distance < best.distance)) best = gap;
  };
  for (const t of targets) {
    const overlapY = Math.min(moving.maxY, t.maxY) - Math.max(moving.minY, t.minY);
    if (overlapY > 0) {
      const y = (Math.max(moving.minY, t.minY) + Math.min(moving.maxY, t.maxY)) / 2;
      if (t.minX >= moving.maxX) consider({ x1: moving.maxX, y1: y, x2: t.minX, y2: y, distance: t.minX - moving.maxX });
      if (t.maxX <= moving.minX) consider({ x1: t.maxX, y1: y, x2: moving.minX, y2: y, distance: moving.minX - t.maxX });
    }
    const overlapX = Math.min(moving.maxX, t.maxX) - Math.max(moving.minX, t.minX);
    if (overlapX > 0) {
      const x = (Math.max(moving.minX, t.minX) + Math.min(moving.maxX, t.maxX)) / 2;
      if (t.minY >= moving.maxY) consider({ x1: x, y1: moving.maxY, x2: x, y2: t.minY, distance: t.minY - moving.maxY });
      if (t.maxY <= moving.minY) consider({ x1: x, y1: t.maxY, x2: x, y2: moving.minY, distance: moving.minY - t.maxY });
    }
  }
  return best;
}

// ---------------------------------------------------------------------------------------------
// Alinear y distribuir
// ---------------------------------------------------------------------------------------------

export type AlignMode = "left" | "center" | "right" | "top" | "middle" | "bottom";

/** Alinea las cajas de varios elementos con el borde o centro común de la selección. */
export function alignShapes(shapes: PlacedShape[], mode: AlignMode): Position[] {
  const boxes = shapes.map(shapeBox);
  const all = unionBox(boxes);
  if (!all || shapes.length < 2) return shapes.map(({ id, x, y }) => ({ id, x, y }));
  return shapes.map((shape, i) => {
    const b = boxes[i];
    let dx = 0;
    let dy = 0;
    if (mode === "left") dx = all.minX - b.minX;
    if (mode === "right") dx = all.maxX - b.maxX;
    if (mode === "center") dx = (all.minX + all.maxX) / 2 - (b.minX + b.maxX) / 2;
    if (mode === "top") dy = all.minY - b.minY;
    if (mode === "bottom") dy = all.maxY - b.maxY;
    if (mode === "middle") dy = (all.minY + all.maxY) / 2 - (b.minY + b.maxY) / 2;
    return { id: shape.id, x: shape.x + dx, y: shape.y + dy };
  });
}

/**
 * Reparte los elementos con el mismo espacio libre entre uno y otro (como Figma): el primero y
 * el último no se mueven. Hace falta al menos tres.
 */
export function distributeShapes(shapes: PlacedShape[], axis: "horizontal" | "vertical"): Position[] {
  if (shapes.length < 3) return shapes.map(({ id, x, y }) => ({ id, x, y }));
  const horizontal = axis === "horizontal";
  const items = shapes
    .map((shape) => ({ shape, box: shapeBox(shape) }))
    .sort((a, b) => (horizontal ? a.shape.x - b.shape.x : a.shape.y - b.shape.y));
  const min = (b: Box) => (horizontal ? b.minX : b.minY);
  const max = (b: Box) => (horizontal ? b.maxX : b.maxY);
  const first = items[0].box;
  const last = items[items.length - 1].box;
  const sizes = items.reduce((sum, { box }) => sum + max(box) - min(box), 0);
  const gap = (max(last) - min(first) - sizes) / (items.length - 1);

  let cursor = min(first);
  const result = new Map<string, Position>();
  for (const { shape, box } of items) {
    const delta = cursor - min(box);
    result.set(shape.id, { id: shape.id, x: shape.x + (horizontal ? delta : 0), y: shape.y + (horizontal ? 0 : delta) });
    cursor += max(box) - min(box) + gap;
  }
  return shapes.map((shape) => result.get(shape.id)!);
}

/** Desplazamientos de una matriz de filas × columnas (sin la celda 0,0, que es el original), por filas. */
export function matrixOffsets(rows: number, columns: number, stepX: number, stepY: number) {
  const offsets: { dx: number; dy: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      if (r === 0 && c === 0) continue;
      offsets.push({ dx: c * stepX, dy: r * stepY });
    }
  }
  return offsets;
}

// ---------------------------------------------------------------------------------------------
// Colocación de elementos nuevos
// ---------------------------------------------------------------------------------------------

const MAX_RINGS = 8;

/** Celdas del anillo `ring` alrededor de (0, 0): primero las más cercanas (y a la derecha/abajo ante empate). */
function ringCells(ring: number) {
  if (ring === 0) return [{ i: 0, j: 0 }];
  const cells: { i: number; j: number }[] = [];
  for (let i = -ring; i <= ring; i++) {
    for (let j = -ring; j <= ring; j++) {
      if (Math.max(Math.abs(i), Math.abs(j)) === ring) cells.push({ i, j });
    }
  }
  return cells.sort((a, b) => Math.hypot(a.i, a.j) - Math.hypot(b.i, b.j) || b.i - a.i || b.j - a.j);
}

const insideBox = (box: Box, area: Box) =>
  box.minX >= area.minX && box.minY >= area.minY && box.maxX <= area.maxX && box.maxY <= area.maxY;

/** ¿Ninguna de `boxes` se encima con `occupied` (y, con `bounds`, todas quedan dentro)? */
export function isFreeArea(boxes: Box[], occupied: Box[], bounds?: Box): boolean {
  if (bounds && !boxes.every((b) => insideBox(b, bounds))) return false;
  return boxes.every((b) => occupied.every((o) => !boxesIntersect(b, o)));
}

/**
 * Desplazamiento para mover un grupo de cajas (copias, un elemento nuevo) sin encimarlo con
 * `occupied`: prueba sin moverlo y luego anillos cada vez más lejanos, en pasos de
 * stepX × stepY. Con `bounds`, ninguna caja puede salirse de ahí. null si no hay hueco.
 */
export function findFreeOffset(
  boxes: Box[],
  occupied: Box[],
  stepX: number,
  stepY: number,
  bounds?: Box
): { dx: number; dy: number } | null {
  for (let ring = 0; ring <= MAX_RINGS; ring++) {
    for (const { i, j } of ringCells(ring)) {
      const dx = i * stepX;
      const dy = j * stepY;
      if (isFreeArea(boxes.map((b) => translateBox(b, dx, dy)), occupied, bounds)) return { dx, dy };
    }
  }
  return null;
}

/**
 * Punto libre lo más cerca posible de `center` para un elemento de width × height: prueba el
 * centro y luego anillos cada vez más lejanos (pasos del tamaño del elemento + `margin`) hasta
 * encontrar un hueco que no se encime con `occupied` (y, con `bounds`, que quede dentro). Si
 * todo está lleno, se desplaza en diagonal.
 */
export function findFreeSpot(
  center: { x: number; y: number },
  width: number,
  height: number,
  occupied: Box[],
  margin = 0,
  bounds?: Box
): { x: number; y: number } {
  const stepX = width + margin;
  const stepY = height + margin;
  const box = { minX: center.x - width / 2, minY: center.y - height / 2, maxX: center.x + width / 2, maxY: center.y + height / 2 };
  const offset = findFreeOffset([box], occupied, stepX, stepY, bounds);
  if (offset) return { x: center.x + offset.dx, y: center.y + offset.dy };
  const shift = (occupied.length % 10) * 0.25;
  return { x: center.x + stepX * shift, y: center.y + stepY * shift };
}
