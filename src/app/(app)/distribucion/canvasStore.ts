import { create } from "zustand";
import type { LayoutElement, RoomFixture } from "@/generated/prisma";
import {
  ELEMENT_LABELS,
  getDefaultElementShape,
  getRoomShapePreset,
  isTableType,
  type ElementType,
  type RoomPoint,
  type RoomShapePreset,
} from "@/lib/seatGeometry";
import { getDefaultFixtureSize, type FixtureType } from "@/lib/roomFixtures";
import { resolvePxPerMeter } from "@/lib/layoutUnits";

type SaveStatus = "idle" | "saving" | "saved";
export type Background = "indoor" | "garden";

type CanvasState = {
  elements: LayoutElement[];
  selectedId: string | null;
  canvasWidth: number;
  canvasHeight: number;
  background: Background;
  dirty: boolean;
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
  selectedFixtureId: string | null;
  roomEditMode: boolean;
  // Modo "dibujar a mano libre": el Stage deja de hacer pan y captura el trazo del mouse.
  roomDrawMode: boolean;
  setElements: (
    elements: LayoutElement[],
    layout?: {
      canvasWidth?: number;
      canvasHeight?: number;
      background?: Background;
      roomShape?: RoomPoint[];
      roomFixtures?: RoomFixture[];
      pxPerMeter?: number | null;
    }
  ) => void;
  /** Centro de la zona visible del lienzo: ahí aparecen los elementos nuevos. */
  viewCenter: { x: number; y: number } | null;
  setViewCenter: (center: { x: number; y: number }) => void;
  addElement: (type: ElementType) => void;
  updateElement: (id: string, patch: Partial<LayoutElement>) => void;
  removeElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  setCanvasSize: (width: number, height: number) => void;
  setBackground: (background: Background) => void;
  setSaveStatus: (status: SaveStatus) => void;
  markClean: () => void;
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
  addFixture: (type: FixtureType) => void;
  updateFixture: (id: string, patch: Partial<RoomFixture>) => void;
  removeFixture: (id: string) => void;
  selectFixture: (id: string | null) => void;
};

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 2.5;

let nextTableNumberCounter = 0;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  elements: [],
  selectedId: null,
  canvasWidth: 2000,
  canvasHeight: 1400,
  background: "indoor",
  dirty: false,
  saveStatus: "idle",
  zoom: 1,
  stageX: 0,
  stageY: 0,
  pxPerMeter: null,
  roomShape: [],
  roomFixtures: [],
  selectedFixtureId: null,
  roomEditMode: false,
  roomDrawMode: false,
  viewCenter: null,

  setViewCenter: (center) => set({ viewCenter: center }),

  setElements: (elements, layout = {}) => {
    const { canvasWidth, canvasHeight, background, roomShape } = layout;
    nextTableNumberCounter = elements.reduce(
      (max, el) => Math.max(max, el.tableNumber ?? 0),
      0
    );
    set({
      elements,
      selectedId: null,
      selectedFixtureId: null,
      dirty: false,
      saveStatus: "idle",
      roomEditMode: false,
      roomDrawMode: false,
      // El store es compartido entre pestañas de eventos: siempre se reemplazan (no heredar del anterior).
      roomFixtures: layout.roomFixtures ?? [],
      pxPerMeter: layout.pxPerMeter ?? null,
      ...(canvasWidth ? { canvasWidth } : {}),
      ...(canvasHeight ? { canvasHeight } : {}),
      ...(background ? { background } : {}),
      ...(roomShape ? { roomShape } : {}),
    });
  },

  addElement: (type) => {
    const shape = getDefaultElementShape(type, resolvePxPerMeter(get().pxPerMeter));
    const isTable = isTableType(type);
    if (isTable) nextTableNumberCounter += 1;

    const newElement: LayoutElement = {
      id: crypto.randomUUID(),
      type,
      label: isTable ? `Mesa ${nextTableNumberCounter}` : ELEMENT_LABELS[type],
      tableNumber: isTable ? nextTableNumberCounter : null,
      x: get().viewCenter?.x ?? get().canvasWidth / 2,
      y: get().viewCenter?.y ?? get().canvasHeight / 2,
      width: shape.width,
      height: shape.height,
      rotation: 0,
      capacity: shape.capacity,
      rows: shape.rows,
      columns: shape.columns,
      fill: null,
      zIndex: get().elements.length,
    };

    set((state) => ({
      elements: [...state.elements, newElement],
      selectedId: newElement.id,
      dirty: true,
    }));
  },

  updateElement: (id, patch) => {
    set((state) => ({
      elements: state.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
      dirty: true,
    }));
  },

  removeElement: (id) => {
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      dirty: true,
    }));
  },

  selectElement: (id) => set({ selectedId: id }),
  setCanvasSize: (canvasWidth, canvasHeight) => set({ canvasWidth, canvasHeight, dirty: true }),
  setBackground: (background) => set({ background, dirty: true }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  markClean: () => set({ dirty: false, saveStatus: "saved" }),

  setView: ({ zoom, stageX, stageY }) => set({ zoom, stageX, stageY }),
  resetView: () => set({ zoom: 1, stageX: 0, stageY: 0 }),

  applyRoomShapePreset: (preset) => {
    const { canvasWidth, canvasHeight } = get();
    set({ roomShape: getRoomShapePreset(preset, canvasWidth, canvasHeight), dirty: true });
  },
  toggleRoomEditMode: () => {
    // Al entrar o salir del modo "Editar salón" se suelta la selección de la otra capa. Entrar
    // no crea un contorno ni marca cambios: el contorno solo se define con una forma explícita
    // ("Forma del local") para no guardar uno que el layout nunca tuvo.
    set((state) => ({ selectedId: null, selectedFixtureId: null, roomEditMode: !state.roomEditMode }));
  },
  updateRoomPoint: (index, point) => {
    set((state) => ({
      roomShape: state.roomShape.map((p, i) => (i === index ? point : p)),
      dirty: true,
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
      return { roomShape: next, dirty: true };
    });
  },
  removeRoomPoint: (index) => {
    set((state) => {
      if (state.roomShape.length <= 3) return {};
      return { roomShape: state.roomShape.filter((_, i) => i !== index), dirty: true };
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
      return { roomShape: rotated, dirty: true };
    });
  },
  setRoomDrawMode: (active) =>
    set({
      roomDrawMode: active,
      roomEditMode: active ? false : get().roomEditMode,
      ...(active ? { selectedId: null, selectedFixtureId: null } : {}),
    }),
  setRoomShapeFromPoints: (points) => {
    if (points.length < 3) {
      set({ roomDrawMode: false });
      return;
    }
    set({ roomShape: points, roomDrawMode: false, roomEditMode: true, dirty: true });
  },

  addFixture: (type) => {
    const size = getDefaultFixtureSize(type, resolvePxPerMeter(get().pxPerMeter));
    const fixture: RoomFixture = {
      id: crypto.randomUUID(),
      type,
      label: "",
      x: get().viewCenter?.x ?? get().canvasWidth / 2,
      y: get().viewCenter?.y ?? get().canvasHeight / 2,
      width: size.width,
      height: size.height,
      rotation: 0,
    };
    set((state) => ({ roomFixtures: [...state.roomFixtures, fixture], selectedFixtureId: fixture.id, dirty: true }));
  },
  updateFixture: (id, patch) => {
    set((state) => ({
      roomFixtures: state.roomFixtures.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      dirty: true,
    }));
  },
  removeFixture: (id) => {
    set((state) => ({
      roomFixtures: state.roomFixtures.filter((f) => f.id !== id),
      selectedFixtureId: state.selectedFixtureId === id ? null : state.selectedFixtureId,
      dirty: true,
    }));
  },
  selectFixture: (id) => set({ selectedFixtureId: id }),
}));
