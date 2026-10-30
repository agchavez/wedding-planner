import { create } from "zustand";
import type { LayoutElement, PlanImage, RoomFixture } from "@/generated/prisma";
import {
  ELEMENT_LABELS,
  getDefaultElementShape,
  getElementFootprint,
  getRoomShapePreset,
  isTableType,
  MAX_LAYOUT_ELEMENTS,
  type ElementType,
  type RoomPoint,
  type RoomShapePreset,
} from "@/lib/seatGeometry";
import { getDefaultFixtureSize, MAX_ROOM_FIXTURES, type FixtureType } from "@/lib/roomFixtures";
import { metersToPx, resolvePxPerMeter } from "@/lib/layoutUnits";
import { rescaleElementSizes, type RoomLayer } from "@/lib/venueLibrary";
import {
  alignShapes,
  distributeShapes,
  findFreeOffset,
  findFreeSpot,
  isFreeArea,
  matrixOffsets,
  shapeBox,
  translateBox,
  unionBox,
  type AlignMode,
  type Box,
  type GapMeasure,
  type GuideLine,
  type PlacedShape,
  type Position,
} from "@/lib/layoutGeometry";
import {
  breakHistoryGroup,
  emptyHistory,
  recordHistory,
  redoHistory,
  undoHistory,
  type History,
} from "@/lib/editorHistory";

export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type Background = "indoor" | "garden";
/** Herramienta del lienzo: seleccionar (arrastrar en vacío = rectángulo) o mover el plano. */
export type CanvasTool = "select" | "pan";

/** Lo que se puede deshacer: todo lo que se guarda del layout (la vista y la selección no). */
type LayoutSnapshot = {
  elements: LayoutElement[];
  roomShape: RoomPoint[];
  roomFixtures: RoomFixture[];
  canvasWidth: number;
  canvasHeight: number;
  background: Background;
  pxPerMeter: number | null;
  backgroundImage: PlanImage | null;
  baseRoomVersionId: string | null;
};

/** Elemento de cualquiera de las dos capas (boda o salón): ambos están centrados en (x, y). */
type LayerItem = LayoutElement | RoomFixture;
type ItemUpdate = { id: string } & Partial<Pick<LayerItem, "x" | "y" | "width" | "height" | "rotation">>;

export type SnapGuides = { lines: GuideLine[]; gap: GapMeasure | null };

type CanvasState = {
  elements: LayoutElement[];
  /** Selección de la capa activa: elementos de la boda, o elementos fijos en "Editar salón". */
  selectedIds: string[];
  canvasWidth: number;
  canvasHeight: number;
  background: Background;
  dirty: boolean;
  /** Sube con cada cambio guardable: el autoguardado solo marca "guardado" si no hubo cambios mientras tanto. */
  revision: number;
  saveStatus: SaveStatus;
  // Vista de cámara del Stage (zoom/pan). Efímera: no se persiste en la base de datos.
  zoom: number;
  stageX: number;
  stageY: number;
  // Escala guardada (px por metro). null = layout sin escala: se usa DEFAULT_PX_PER_METER y no se
  // escribe nada al guardar. Usar resolvePxPerMeter(pxPerMeter) para la escala efectiva.
  pxPerMeter: number | null;
  // Capa salón: contorno del local (polígono; vacío = sin definir) + elementos fijos (paredes,
  // columnas, puertas...). Bloqueada salvo en el modo "Editar salón" (roomEditMode).
  roomShape: RoomPoint[];
  roomFixtures: RoomFixture[];
  roomEditMode: boolean;
  // Plano importado como fondo de la capa salón (null = sin plano).
  backgroundImage: PlanImage | null;
  // Versión de la biblioteca de salones de la que salió la capa salón (null = salón propio).
  baseRoomVersionId: string | null;
  // Calibración por dos puntos en curso: los puntos marcados (0 a 2). null = no se está calibrando.
  calibrationPoints: RoomPoint[] | null;
  // Modo "dibujar a mano libre": el Stage deja de hacer pan y captura el trazo del mouse.
  roomDrawMode: boolean;
  tool: CanvasTool;
  history: History<LayoutSnapshot>;
  // Guías inteligentes del arrastre en curso y si hay un arrastre/gesto (oculta la barra contextual).
  snapGuides: SnapGuides | null;
  interacting: boolean;
  /** Hay un borrado de la selección esperando confirmación (ver needsDeleteConfirmation). */
  pendingDelete: boolean;
  setElements: (
    elements: LayoutElement[],
    layout?: {
      canvasWidth?: number;
      canvasHeight?: number;
      background?: Background;
      roomShape?: RoomPoint[];
      roomFixtures?: RoomFixture[];
      pxPerMeter?: number | null;
      backgroundImage?: PlanImage | null;
      baseRoomVersionId?: string | null;
    }
  ) => void;
  /** Centro de la zona visible del lienzo: ahí aparecen los elementos nuevos. */
  viewCenter: { x: number; y: number } | null;
  setViewCenter: (center: { x: number; y: number }) => void;
  /** false si la capa ya llegó a su máximo de elementos (no agrega nada). */
  addElement: (type: ElementType) => boolean;
  updateElement: (id: string, patch: Partial<LayoutElement>) => void;
  removeElement: (id: string) => void;
  select: (id: string | null, additive?: boolean) => void;
  setSelection: (ids: string[]) => void;
  selectAll: () => void;
  updateItems: (updates: ItemUpdate[]) => void;
  nudgeSelection: (dx: number, dy: number) => void;
  rotateSelection: (deltaDegrees: number) => void;
  deleteSelection: () => void;
  /** Borrar desde el teclado o la barra: pide confirmación si hace falta, si no borra directo. */
  requestDeleteSelection: () => void;
  cancelDeleteRequest: () => void;
  /** false si las copias rebasarían el máximo de la capa (no duplica nada). */
  duplicateSelection: () => boolean;
  duplicateMatrix: (rows: number, columns: number, gapXMeters: number, gapYMeters: number) => boolean;
  alignSelection: (mode: AlignMode) => void;
  distributeSelection: (axis: "horizontal" | "vertical") => void;
  undo: () => void;
  redo: () => void;
  breakHistoryGroup: () => void;
  setTool: (tool: CanvasTool) => void;
  setSnapGuides: (guides: SnapGuides | null) => void;
  setInteracting: (interacting: boolean) => void;
  setCanvasSize: (width: number, height: number) => void;
  setBackground: (background: Background) => void;
  setSaveStatus: (status: SaveStatus) => void;
  /** Fin de un guardado de la revisión `savedRevision`: solo queda limpio si no cambió nada desde entonces. */
  markClean: (savedRevision: number) => void;
  setView: (view: { zoom: number; stageX: number; stageY: number }) => void;
  resetView: () => void;
  applyRoomShapePreset: (preset: RoomShapePreset) => void;
  toggleRoomEditMode: () => void;
  updateRoomPoint: (index: number, point: RoomPoint) => void;
  addRoomPoint: (afterIndex: number) => void;
  removeRoomPoint: (index: number) => void;
  rotateRoomShape: (deltaDegrees: number) => void;
  setRoomDrawMode: (active: boolean) => void;
  setRoomShapeFromPoints: (points: RoomPoint[]) => void;
  addFixture: (type: FixtureType) => boolean;
  updateFixture: (id: string, patch: Partial<RoomFixture>) => void;
  removeFixture: (id: string) => void;
  /** Pone, cambia (opacidad, posición) o quita el plano de fondo. */
  setBackgroundImage: (image: PlanImage | null, historyKey?: string) => void;
  /** Reemplaza la capa salón por la de la biblioteca (ya en la escala del layout); las mesas no se tocan. */
  applyRoomLayer: (layer: RoomLayer, versionId: string) => void;
  /** Vincula el layout a una versión recién guardada en la biblioteca (la capa salón no cambia). */
  linkBaseRoomVersion: (versionId: string) => void;
  startCalibration: () => void;
  addCalibrationPoint: (point: RoomPoint) => void;
  cancelCalibration: () => void;
  /** Fija la escala calibrada: las mesas conservan su tamaño real (ver rescaleElementSizes). */
  applyCalibration: (pxPerMeter: number) => void;
};

// Bajo para que "Ver todo el salón" quepa completo también en un teléfono (~360 px de ancho).
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 2.5;

// Separación libre (en metros) al colocar elementos nuevos o duplicados junto a otros.
const PLACEMENT_GAP_METERS = 0.6;
const DUPLICATE_GAP_METERS = 1;

let nextTableNumberCounter = 0;

/** Figura con la huella real (mesa + sillas) de un elemento de la boda. */
export function elementShape(el: LayoutElement, pxPerMeter: number): PlacedShape {
  const footprint = getElementFootprint(el, pxPerMeter);
  return { id: el.id, x: el.x, y: el.y, rotation: el.rotation, ...footprint };
}

export function fixtureShape(f: RoomFixture): PlacedShape {
  return { id: f.id, x: f.x, y: f.y, width: f.width, height: f.height, rotation: f.rotation, round: f.type === "column-round" };
}

function snapshotOf(state: CanvasState): LayoutSnapshot {
  const { elements, roomShape, roomFixtures, canvasWidth, canvasHeight, background, pxPerMeter, backgroundImage, baseRoomVersionId } = state;
  return { elements, roomShape, roomFixtures, canvasWidth, canvasHeight, background, pxPerMeter, backgroundImage, baseRoomVersionId };
}

/** Cambio que se puede deshacer: guarda el estado anterior en el historial y marca para guardar. */
function track(state: CanvasState, key?: string) {
  return { history: recordHistory(state.history, snapshotOf(state), { key }), dirty: true, revision: state.revision + 1 };
}

function activeItems(state: CanvasState): LayerItem[] {
  return state.roomEditMode ? state.roomFixtures : state.elements;
}

/** Máximo de elementos de la capa activa (el mismo que aplica el servidor al guardar). */
export function activeLayerLimit(state: Pick<CanvasState, "roomEditMode">) {
  return state.roomEditMode ? MAX_ROOM_FIXTURES : MAX_LAYOUT_ELEMENTS;
}

/** ¿Caben `count` elementos más en la capa activa? */
export function canAddToActiveLayer(state: CanvasState, count: number) {
  return activeItems(state).length + count <= activeLayerLimit(state);
}

/**
 * Borrar la selección pide confirmación si incluye alguna mesa (puede tener invitados sentados)
 * o varios elementos a la vez. Una sola zona o pared se borra directo (se puede deshacer).
 */
export function needsDeleteConfirmation(state: CanvasState) {
  const selected = selectedItems(state);
  if (selected.length > 1) return true;
  return !state.roomEditMode && selected.some((item) => isTableType((item as LayoutElement).type));
}

function withActiveItems(state: CanvasState, items: LayerItem[]) {
  return state.roomEditMode ? { roomFixtures: items as RoomFixture[] } : { elements: items as LayoutElement[] };
}

function shapesOf(state: CanvasState, items: LayerItem[]): PlacedShape[] {
  const pxPerMeter = resolvePxPerMeter(state.pxPerMeter);
  return state.roomEditMode
    ? (items as RoomFixture[]).map(fixtureShape)
    : (items as LayoutElement[]).map((el) => elementShape(el, pxPerMeter));
}

function selectedItems(state: CanvasState): LayerItem[] {
  const ids = new Set(state.selectedIds);
  return activeItems(state).filter((item) => ids.has(item.id));
}

function applyPositions(state: CanvasState, positions: Position[], key?: string) {
  const byId = new Map(positions.map((p) => [p.id, p]));
  const items = activeItems(state).map((item) => {
    const p = byId.get(item.id);
    return p ? { ...item, x: p.x, y: p.y } : item;
  });
  return { ...withActiveItems(state, items), ...track(state, key) };
}

/** Etiqueta de una mesa copiada: "Mesa N" se renumera; una etiqueta propia se conserva. */
function copyLabel(el: LayoutElement, tableNumber: number | null) {
  if (tableNumber === null) return el.label;
  return !el.label || /^Mesa \d+$/.test(el.label) ? `Mesa ${tableNumber}` : el.label;
}

/** El lienzo (el salón): lo nuevo y las copias se colocan dentro de él. */
function canvasBox(state: CanvasState): Box {
  return { minX: 0, minY: 0, maxX: state.canvasWidth, maxY: state.canvasHeight };
}

/** Cajas de todo lo que ya está en el plano y que las copias no deben encimar. */
function occupiedBoxes(state: CanvasState) {
  const boxes = shapesOf(state, activeItems(state)).map(shapeBox);
  // Las mesas tampoco se ponen encima de paredes o columnas.
  return state.roomEditMode ? boxes : [...boxes, ...state.roomFixtures.map((f) => shapeBox(fixtureShape(f)))];
}

/**
 * Corrige los desplazamientos de las copias para que ninguna caiga encima de algo que ya está en
 * el plano: si chocan, todo el grupo de copias se corre al siguiente hueco libre (en pasos de
 * stepX × stepY, primero a la derecha y abajo). Si no hay hueco cerca, se dejan como estaban.
 */
function freeOffsets(state: CanvasState, offsets: { dx: number; dy: number }[], stepX: number, stepY: number) {
  const selectedBoxes = shapesOf(state, selectedItems(state)).map(shapeBox);
  const copyBoxes = offsets.flatMap(({ dx, dy }) => selectedBoxes.map((b) => translateBox(b, dx, dy)));
  const shift = findFreeOffset(copyBoxes, occupiedBoxes(state), stepX, stepY, canvasBox(state)) ?? { dx: 0, dy: 0 };
  return offsets.map(({ dx, dy }) => ({ dx: dx + shift.dx, dy: dy + shift.dy }));
}

/**
 * Desplazamientos de la matriz: la cuadrícula conserva al original en una esquina y crece hacia
 * la derecha/abajo, o hacia el lado donde quepa entera sin encimarse (izquierda, arriba). Si no
 * cabe hacia ningún lado, se corre todo el grupo de copias al hueco libre más cercano.
 */
function matrixPlacement(state: CanvasState, rows: number, columns: number, stepX: number, stepY: number) {
  const selectedBoxes = shapesOf(state, selectedItems(state)).map(shapeBox);
  const occupied = occupiedBoxes(state);
  const bounds = canvasBox(state);
  for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const offsets = matrixOffsets(rows, columns, sx * stepX, sy * stepY);
    const copyBoxes = offsets.flatMap(({ dx, dy }) => selectedBoxes.map((b) => translateBox(b, dx, dy)));
    if (isFreeArea(copyBoxes, occupied, bounds)) return offsets;
  }
  return freeOffsets(state, matrixOffsets(rows, columns, stepX, stepY), stepX, stepY);
}

/** Copias de los elementos seleccionados desplazadas por cada offset (ids y números de mesa nuevos). */
function copiesOf(state: CanvasState, offsets: { dx: number; dy: number }[]): LayerItem[] {
  const selected = selectedItems(state);
  const copies: LayerItem[] = [];
  let zIndex = state.elements.length;
  for (const { dx, dy } of offsets) {
    for (const item of selected) {
      const base = { ...item, id: crypto.randomUUID(), x: item.x + dx, y: item.y + dy };
      if (state.roomEditMode) {
        copies.push(base);
        continue;
      }
      const el = base as LayoutElement;
      const tableNumber = isTableType(el.type) ? ++nextTableNumberCounter : null;
      copies.push({ ...el, tableNumber, label: copyLabel(el, tableNumber), zIndex: zIndex++ });
    }
  }
  return copies;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  elements: [],
  selectedIds: [],
  canvasWidth: 2000,
  canvasHeight: 1400,
  background: "indoor",
  dirty: false,
  revision: 0,
  saveStatus: "idle",
  zoom: 1,
  stageX: 0,
  stageY: 0,
  pxPerMeter: null,
  roomShape: [],
  roomFixtures: [],
  roomEditMode: false,
  backgroundImage: null,
  baseRoomVersionId: null,
  calibrationPoints: null,
  roomDrawMode: false,
  tool: "select",
  history: emptyHistory(),
  snapGuides: null,
  interacting: false,
  pendingDelete: false,
  viewCenter: null,

  setViewCenter: (center) => set({ viewCenter: center }),

  setElements: (elements, layout = {}) => {
    const { canvasWidth, canvasHeight, background, roomShape } = layout;
    nextTableNumberCounter = elements.reduce(
      (max, el) => Math.max(max, el.tableNumber ?? 0),
      0
    );
    set((state) => ({
      elements,
      selectedIds: [],
      dirty: false,
      // Nueva revisión: un guardado del evento anterior que termine tarde no marca este como guardado.
      revision: state.revision + 1,
      saveStatus: "idle",
      roomEditMode: false,
      roomDrawMode: false,
      // Cada evento tiene su propio historial: al cambiar de pestaña no se puede deshacer lo del otro.
      history: emptyHistory(),
      snapGuides: null,
      interacting: false,
      pendingDelete: false,
      // El store es compartido entre pestañas de eventos: siempre se reemplazan (no heredar del anterior).
      roomFixtures: layout.roomFixtures ?? [],
      pxPerMeter: layout.pxPerMeter ?? null,
      backgroundImage: layout.backgroundImage ?? null,
      baseRoomVersionId: layout.baseRoomVersionId ?? null,
      calibrationPoints: null,
      ...(canvasWidth ? { canvasWidth } : {}),
      ...(canvasHeight ? { canvasHeight } : {}),
      ...(background ? { background } : {}),
      ...(roomShape ? { roomShape } : {}),
    }));
  },

  addElement: (type) => {
    const state = get();
    if (state.elements.length >= MAX_LAYOUT_ELEMENTS) return false;
    const pxPerMeter = resolvePxPerMeter(state.pxPerMeter);
    const shape = getDefaultElementShape(type, pxPerMeter);
    const isTable = isTableType(type);
    if (isTable) nextTableNumberCounter += 1;

    // En el centro visible, o al lado si ya hay algo ahí (nunca apilados en el mismo punto).
    const footprint = getElementFootprint({ type, ...shape }, pxPerMeter);
    const occupied = [
      ...state.elements.map((el) => shapeBox(elementShape(el, pxPerMeter))),
      ...state.roomFixtures.map((f) => shapeBox(fixtureShape(f))),
    ];
    const center = state.viewCenter ?? { x: state.canvasWidth / 2, y: state.canvasHeight / 2 };
    const spot = findFreeSpot(
      center,
      footprint.width,
      footprint.height,
      occupied,
      metersToPx(PLACEMENT_GAP_METERS, pxPerMeter),
      canvasBox(state)
    );

    const newElement: LayoutElement = {
      id: crypto.randomUUID(),
      type,
      label: isTable ? `Mesa ${nextTableNumberCounter}` : ELEMENT_LABELS[type],
      tableNumber: isTable ? nextTableNumberCounter : null,
      x: spot.x,
      y: spot.y,
      width: shape.width,
      height: shape.height,
      rotation: 0,
      capacity: shape.capacity,
      rows: shape.rows,
      columns: shape.columns,
      fill: null,
      zIndex: state.elements.length,
    };

    set((s) => ({ elements: [...s.elements, newElement], selectedIds: [newElement.id], ...track(s) }));
    return true;
  },

  updateElement: (id, patch) => {
    // Escribir en un campo del panel se agrupa en un solo paso del historial.
    set((state) => ({
      elements: state.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
      ...track(state, `element:${id}:${Object.keys(patch).sort().join(",")}`),
    }));
  },

  removeElement: (id) => {
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedIds: state.selectedIds.filter((s) => s !== id),
      ...track(state),
    }));
  },

  select: (id, additive = false) => {
    if (id === null) return set({ selectedIds: [] });
    set((state) => {
      if (!additive) return { selectedIds: [id] };
      return {
        selectedIds: state.selectedIds.includes(id)
          ? state.selectedIds.filter((s) => s !== id)
          : [...state.selectedIds, id],
      };
    });
  },
  setSelection: (ids) => set({ selectedIds: ids }),
  selectAll: () => set((state) => ({ selectedIds: activeItems(state).map((item) => item.id) })),

  updateItems: (updates) => {
    if (updates.length === 0) return;
    set((state) => {
      const byId = new Map(updates.map((u) => [u.id, u]));
      const items = activeItems(state).map((item) => {
        const u = byId.get(item.id);
        return u ? { ...item, ...u } : item;
      });
      return { ...withActiveItems(state, items), ...track(state) };
    });
  },

  nudgeSelection: (dx, dy) => {
    const state = get();
    const positions = selectedItems(state).map((item) => ({ id: item.id, x: item.x + dx, y: item.y + dy }));
    // Una serie de flechas seguidas es un solo paso del historial.
    if (positions.length) set(applyPositions(state, positions, "nudge"));
  },

  rotateSelection: (deltaDegrees) => {
    set((state) => {
      const ids = new Set(state.selectedIds);
      if (ids.size === 0) return {};
      const items = activeItems(state).map((item) =>
        ids.has(item.id) ? { ...item, rotation: (((item.rotation + deltaDegrees) % 360) + 360) % 360 } : item
      );
      return { ...withActiveItems(state, items), ...track(state, "rotate") };
    });
  },

  deleteSelection: () => {
    set((state) => {
      const ids = new Set(state.selectedIds);
      if (ids.size === 0) return { pendingDelete: false };
      return {
        ...withActiveItems(state, activeItems(state).filter((item) => !ids.has(item.id))),
        selectedIds: [],
        pendingDelete: false,
        ...track(state),
      };
    });
  },
  requestDeleteSelection: () => {
    const state = get();
    if (state.selectedIds.length === 0) return;
    if (needsDeleteConfirmation(state)) set({ pendingDelete: true });
    else state.deleteSelection();
  },
  cancelDeleteRequest: () => set({ pendingDelete: false }),

  duplicateSelection: () => {
    const state = get();
    const selected = selectedItems(state);
    const bounds = unionBox(shapesOf(state, selected).map(shapeBox));
    if (!bounds) return true;
    if (!canAddToActiveLayer(state, selected.length)) return false;
    // La copia aparece a la derecha del original, con un pasillo libre de 1 m (o en el hueco libre más cercano).
    const gap = metersToPx(DUPLICATE_GAP_METERS, resolvePxPerMeter(state.pxPerMeter));
    const stepX = bounds.maxX - bounds.minX + gap;
    const stepY = bounds.maxY - bounds.minY + gap;
    const copies = copiesOf(state, freeOffsets(state, [{ dx: stepX, dy: 0 }], stepX, stepY));
    set({
      ...withActiveItems(state, [...activeItems(state), ...copies]),
      selectedIds: copies.map((c) => c.id),
      ...track(state),
    });
    return true;
  },

  duplicateMatrix: (rows, columns, gapXMeters, gapYMeters) => {
    const state = get();
    const selected = selectedItems(state);
    const bounds = unionBox(shapesOf(state, selected).map(shapeBox));
    if (!bounds || rows < 1 || columns < 1 || rows * columns < 2) return true;
    if (!canAddToActiveLayer(state, selected.length * (rows * columns - 1))) return false;
    const pxPerMeter = resolvePxPerMeter(state.pxPerMeter);
    const stepX = bounds.maxX - bounds.minX + metersToPx(Math.max(0, gapXMeters), pxPerMeter);
    const stepY = bounds.maxY - bounds.minY + metersToPx(Math.max(0, gapYMeters), pxPerMeter);
    const copies = copiesOf(state, matrixPlacement(state, rows, columns, stepX, stepY));
    set({
      ...withActiveItems(state, [...activeItems(state), ...copies]),
      selectedIds: [...state.selectedIds, ...copies.map((c) => c.id)],
      ...track(state),
    });
    return true;
  },

  alignSelection: (mode) => {
    const state = get();
    const shapes = shapesOf(state, selectedItems(state));
    if (shapes.length >= 2) set(applyPositions(state, alignShapes(shapes, mode)));
  },

  distributeSelection: (axis) => {
    const state = get();
    const shapes = shapesOf(state, selectedItems(state));
    if (shapes.length >= 3) set(applyPositions(state, distributeShapes(shapes, axis)));
  },

  undo: () => {
    set((state) => {
      const result = undoHistory(state.history, snapshotOf(state));
      if (!result) return {};
      const next = { ...state, ...result.state };
      const ids = new Set(activeItems(next).map((item) => item.id));
      return {
        ...result.state,
        history: result.history,
        selectedIds: state.selectedIds.filter((id) => ids.has(id)),
        dirty: true,
        revision: state.revision + 1,
      };
    });
  },

  redo: () => {
    set((state) => {
      const result = redoHistory(state.history, snapshotOf(state));
      if (!result) return {};
      const next = { ...state, ...result.state };
      const ids = new Set(activeItems(next).map((item) => item.id));
      return {
        ...result.state,
        history: result.history,
        selectedIds: state.selectedIds.filter((id) => ids.has(id)),
        dirty: true,
        revision: state.revision + 1,
      };
    });
  },

  breakHistoryGroup: () => set((state) => ({ history: breakHistoryGroup(state.history) })),
  setTool: (tool) => set({ tool }),
  setSnapGuides: (snapGuides) => set({ snapGuides }),
  setInteracting: (interacting) => set({ interacting }),

  setCanvasSize: (canvasWidth, canvasHeight) => set((state) => ({ canvasWidth, canvasHeight, ...track(state) })),
  setBackground: (background) => set((state) => ({ background, ...track(state) })),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  markClean: (savedRevision) =>
    set((state) =>
      // Si hubo cambios mientras se guardaba, siguen pendientes: el autoguardado los manda después.
      state.revision === savedRevision ? { dirty: false, saveStatus: "saved" } : { saveStatus: "idle" }
    ),

  setView: ({ zoom, stageX, stageY }) => set({ zoom, stageX, stageY }),
  resetView: () => set({ zoom: 1, stageX: 0, stageY: 0 }),

  applyRoomShapePreset: (preset) => {
    set((state) => ({
      roomShape: getRoomShapePreset(preset, state.canvasWidth, state.canvasHeight),
      ...track(state),
    }));
  },
  toggleRoomEditMode: () => {
    // Al entrar o salir del modo "Editar salón" se suelta la selección (cambia de capa). Entrar
    // no crea un contorno ni marca cambios: el contorno solo se define con una forma explícita
    // ("Forma del local") para no guardar uno que el layout nunca tuvo.
    set((state) => ({ selectedIds: [], roomEditMode: !state.roomEditMode, calibrationPoints: null }));
  },
  updateRoomPoint: (index, point) => {
    // Se llama en cada movimiento del arrastre: todo el arrastre es un solo paso.
    set((state) => ({
      roomShape: state.roomShape.map((p, i) => (i === index ? point : p)),
      ...track(state, `room-point:${index}`),
    }));
  },
  addRoomPoint: (afterIndex) => {
    set((state) => {
      const points = state.roomShape;
      const a = points[afterIndex];
      const b = points[(afterIndex + 1) % points.length];
      if (!a || !b) return {};
      const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const next = [...points.slice(0, afterIndex + 1), midpoint, ...points.slice(afterIndex + 1)];
      return { roomShape: next, ...track(state) };
    });
  },
  removeRoomPoint: (index) => {
    set((state) => {
      if (state.roomShape.length <= 3) return {};
      return { roomShape: state.roomShape.filter((_, i) => i !== index), ...track(state) };
    });
  },
  rotateRoomShape: (deltaDegrees) => {
    set((state) => {
      const points = state.roomShape;
      if (points.length < 3) return {};
      const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
      const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;
      const rad = (deltaDegrees * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rotated = points.map((p) => {
        const dx = p.x - cx;
        const dy = p.y - cy;
        return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
      });
      return { roomShape: rotated, ...track(state, "room-rotate") };
    });
  },
  setRoomDrawMode: (active) =>
    set({
      roomDrawMode: active,
      roomEditMode: active ? false : get().roomEditMode,
      ...(active ? { selectedIds: [], calibrationPoints: null } : {}),
    }),
  setRoomShapeFromPoints: (points) => {
    if (points.length < 3) {
      set({ roomDrawMode: false });
      return;
    }
    set((state) => ({ roomShape: points, roomDrawMode: false, roomEditMode: true, selectedIds: [], ...track(state) }));
  },

  addFixture: (type) => {
    const state = get();
    if (state.roomFixtures.length >= MAX_ROOM_FIXTURES) return false;
    const pxPerMeter = resolvePxPerMeter(state.pxPerMeter);
    const size = getDefaultFixtureSize(type, pxPerMeter);
    const center = state.viewCenter ?? { x: state.canvasWidth / 2, y: state.canvasHeight / 2 };
    // Tampoco encima de las mesas: quedarían tapadas por la capa de la boda.
    const occupied = [
      ...state.roomFixtures.map((f) => shapeBox(fixtureShape(f))),
      ...state.elements.map((el) => shapeBox(elementShape(el, pxPerMeter))),
    ];
    const spot = findFreeSpot(
      center,
      size.width,
      size.height,
      occupied,
      metersToPx(PLACEMENT_GAP_METERS, pxPerMeter),
      canvasBox(state)
    );
    const fixture: RoomFixture = {
      id: crypto.randomUUID(),
      type,
      label: "",
      x: spot.x,
      y: spot.y,
      width: size.width,
      height: size.height,
      rotation: 0,
    };
    set((s) => ({ roomFixtures: [...s.roomFixtures, fixture], selectedIds: [fixture.id], ...track(s) }));
    return true;
  },
  updateFixture: (id, patch) => {
    set((state) => ({
      roomFixtures: state.roomFixtures.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      ...track(state, `fixture:${id}:${Object.keys(patch).sort().join(",")}`),
    }));
  },
  removeFixture: (id) => {
    set((state) => ({
      roomFixtures: state.roomFixtures.filter((f) => f.id !== id),
      selectedIds: state.selectedIds.filter((s) => s !== id),
      ...track(state),
    }));
  },

  setBackgroundImage: (backgroundImage, historyKey) => set((state) => ({ backgroundImage, ...track(state, historyKey) })),
  applyRoomLayer: (layer, versionId) =>
    set((state) => ({
      roomShape: layer.roomShape,
      roomFixtures: layer.roomFixtures,
      canvasWidth: layer.canvasWidth,
      canvasHeight: layer.canvasHeight,
      background: layer.background,
      backgroundImage: layer.backgroundImage,
      pxPerMeter: layer.pxPerMeter,
      baseRoomVersionId: versionId,
      selectedIds: [],
      roomEditMode: false,
      roomDrawMode: false,
      calibrationPoints: null,
      ...track(state),
    })),
  // Sin paso propio en el historial: deshacer no debe "desguardar" el salón de la biblioteca. Los
  // pasos guardados con el mismo salón base que el actual pasan al nuevo; así deshacer un cambio
  // anterior no devuelve el vínculo viejo. Los de antes de aplicar otro salón (applyRoomLayer)
  // conservan el suyo: al deshacer eso vuelve también su vínculo.
  linkBaseRoomVersion: (baseRoomVersionId) =>
    set((state) => {
      const previous = state.baseRoomVersionId;
      const relink = (s: LayoutSnapshot) => (s.baseRoomVersionId === previous ? { ...s, baseRoomVersionId } : s);
      return {
        baseRoomVersionId,
        history: { ...state.history, past: state.history.past.map(relink), future: state.history.future.map(relink) },
        dirty: true,
        revision: state.revision + 1,
      };
    }),

  startCalibration: () => set({ calibrationPoints: [], roomDrawMode: false, roomEditMode: false, selectedIds: [] }),
  addCalibrationPoint: (point) =>
    set((state) => (state.calibrationPoints && state.calibrationPoints.length < 2 ? { calibrationPoints: [...state.calibrationPoints, point] } : {})),
  cancelCalibration: () => set({ calibrationPoints: null }),
  applyCalibration: (pxPerMeter) =>
    set((state) => {
      // El historial guarda la escala efectiva (no null): al deshacer, el guardado la escribe y no
      // se queda en la base de datos la escala calibrada (null = "no tocar" al guardar).
      const before = { ...state, pxPerMeter: resolvePxPerMeter(state.pxPerMeter) };
      return {
        elements: rescaleElementSizes(state.elements, before.pxPerMeter, pxPerMeter),
        pxPerMeter,
        calibrationPoints: null,
        ...track(before),
      };
    }),
}));

/** Caja (en el lienzo) de la selección actual, o null si no hay nada seleccionado. */
export function selectionBounds(state: CanvasState) {
  return unionBox(shapesOf(state, selectedItems(state)).map(shapeBox));
}

/** Figuras de la capa activa y de los demás objetos contra los que se alinea al arrastrar. */
export function snapContext(state: CanvasState) {
  const pxPerMeter = resolvePxPerMeter(state.pxPerMeter);
  const active = shapesOf(state, activeItems(state));
  // Las mesas también se alinean con paredes y columnas; los elementos fijos, solo entre sí.
  const extra = state.roomEditMode ? [] : state.roomFixtures.map(fixtureShape);
  return { pxPerMeter, active, extra };
}
