import { beforeEach, describe, expect, it } from "vitest";
import { useCanvasStore } from "./canvasStore";

describe("toggleRoomEditMode", () => {
  beforeEach(() => {
    useCanvasStore.setState({ roomShape: [], roomEditMode: false, dirty: false, selectedId: "el-1" });
  });

  it("entrar y salir del modo sin editar no crea un contorno ni marca cambios", () => {
    const { toggleRoomEditMode } = useCanvasStore.getState();
    toggleRoomEditMode();
    expect(useCanvasStore.getState()).toMatchObject({ roomEditMode: true, roomShape: [], dirty: false, selectedId: null });
    toggleRoomEditMode();
    expect(useCanvasStore.getState()).toMatchObject({ roomEditMode: false, roomShape: [], dirty: false });
  });

  it("el contorno solo se crea con una forma explícita", () => {
    const { toggleRoomEditMode, applyRoomShapePreset } = useCanvasStore.getState();
    toggleRoomEditMode();
    applyRoomShapePreset("rectangle");
    expect(useCanvasStore.getState().roomShape.length).toBeGreaterThanOrEqual(3);
    expect(useCanvasStore.getState().dirty).toBe(true);
  });
});
