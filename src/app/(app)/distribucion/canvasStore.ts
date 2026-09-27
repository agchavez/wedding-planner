import { create } from "zustand";
import type { LayoutElement } from "@/generated/prisma";
import { ELEMENT_LABELS, getDefaultElementShape, isTableType, type ElementType } from "@/lib/seatGeometry";

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
  setElements: (elements: LayoutElement[], canvasWidth?: number, canvasHeight?: number, background?: Background) => void;
  addElement: (type: ElementType) => void;
  updateElement: (id: string, patch: Partial<LayoutElement>) => void;
  removeElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  setCanvasSize: (width: number, height: number) => void;
  setBackground: (background: Background) => void;
  setSaveStatus: (status: SaveStatus) => void;
  markClean: () => void;
};

let nextTableNumberCounter = 0;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  elements: [],
  selectedId: null,
  canvasWidth: 2000,
  canvasHeight: 1400,
  background: "indoor",
  dirty: false,
  saveStatus: "idle",

  setElements: (elements, canvasWidth, canvasHeight, background) => {
    nextTableNumberCounter = elements.reduce(
      (max, el) => Math.max(max, el.tableNumber ?? 0),
      0
    );
    set({
      elements,
      selectedId: null,
      dirty: false,
      saveStatus: "idle",
      ...(canvasWidth ? { canvasWidth } : {}),
      ...(canvasHeight ? { canvasHeight } : {}),
      ...(background ? { background } : {}),
    });
  },

  addElement: (type) => {
    const shape = getDefaultElementShape(type);
    const isTable = isTableType(type);
    if (isTable) nextTableNumberCounter += 1;

    const newElement: LayoutElement = {
      id: crypto.randomUUID(),
      type,
      label: isTable ? `Mesa ${nextTableNumberCounter}` : ELEMENT_LABELS[type],
      tableNumber: isTable ? nextTableNumberCounter : null,
      x: get().canvasWidth / 2,
      y: get().canvasHeight / 2,
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
}));
