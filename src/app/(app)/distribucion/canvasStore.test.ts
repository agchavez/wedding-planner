import { beforeEach, describe, expect, it } from "vitest";
import { elementShape, fixtureShape, needsDeleteConfirmation, selectionBounds, useCanvasStore } from "./canvasStore";
import { boxesIntersect, shapeBox } from "@/lib/layoutGeometry";
import { DEFAULT_PX_PER_METER } from "@/lib/layoutUnits";
import { MAX_ROOM_FIXTURES } from "@/lib/roomFixtures";
import { MAX_LAYOUT_ELEMENTS } from "@/lib/seatGeometry";
import type { LayoutElement, RoomFixture } from "@/generated/prisma";

describe("toggleRoomEditMode", () => {
  beforeEach(() => {
    useCanvasStore.setState({ roomShape: [], roomEditMode: false, dirty: false, selectedIds: ["el-1"] });
  });

  it("entrar y salir del modo sin editar no crea un contorno ni marca cambios", () => {
    const { toggleRoomEditMode } = useCanvasStore.getState();
    toggleRoomEditMode();
    expect(useCanvasStore.getState()).toMatchObject({ roomEditMode: true, roomShape: [], dirty: false, selectedIds: [] });
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

describe("editor moderno", () => {
  beforeEach(() => {
    useCanvasStore.getState().setElements([], { roomFixtures: [], roomShape: [], pxPerMeter: null });
    useCanvasStore.setState({ viewCenter: { x: 1000, y: 700 } });
  });

  const state = () => useCanvasStore.getState();

  it("los elementos nuevos no se apilan en el mismo punto", () => {
    for (let i = 0; i < 6; i++) state().addElement("table-round");
    const boxes = state().elements.map((el) => shapeBox(elementShape(el, DEFAULT_PX_PER_METER)));
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) expect(boxesIntersect(boxes[i], boxes[j])).toBe(false);
    }
    expect(state().elements[0]).toMatchObject({ x: 1000, y: 700 });
  });

  it("los elementos fijos nuevos tampoco se apilan", () => {
    state().toggleRoomEditMode();
    state().addFixture("column");
    state().addFixture("column");
    const [a, b] = state().roomFixtures;
    expect(a.x !== b.x || a.y !== b.y).toBe(true);
  });

  it("deshacer y rehacer agregar y borrar", () => {
    state().addElement("table-round");
    state().addElement("table-rectangular");
    state().setSelection(state().elements.map((el) => el.id));
    state().deleteSelection();
    expect(state().elements).toHaveLength(0);
    state().undo();
    expect(state().elements).toHaveLength(2);
    state().undo();
    expect(state().elements).toHaveLength(1);
    state().redo();
    state().redo();
    expect(state().elements).toHaveLength(0);
    expect(state().dirty).toBe(true);
  });

  it("una serie de flechas es un solo paso; escribir en un campo, también", () => {
    state().addElement("table-round");
    const id = state().elements[0].id;
    const before = state().history.past.length;
    state().setSelection([id]);
    state().nudgeSelection(5, 0);
    state().nudgeSelection(5, 0);
    state().nudgeSelection(0, 5);
    expect(state().elements[0].x).toBe(1010);
    expect(state().history.past.length).toBe(before + 1);
    state().updateElement(id, { label: "M" });
    state().updateElement(id, { label: "Me" });
    state().updateElement(id, { label: "Mesa" });
    expect(state().history.past.length).toBe(before + 2);
    state().undo();
    expect(state().elements[0].label).toBe("Mesa 1");
  });

  it("un arrastre de varios elementos se guarda como un solo paso", () => {
    state().addElement("table-round");
    state().addElement("table-round");
    const before = state().history.past.length;
    state().updateItems(state().elements.map((el) => ({ id: el.id, x: el.x + 50, y: el.y })));
    expect(state().history.past.length).toBe(before + 1);
    state().undo();
    expect(state().elements[0].x).toBe(1000);
  });

  it("duplicar varios crea copias al lado, con ids y números de mesa nuevos", () => {
    state().addElement("table-round");
    state().addElement("table-round");
    state().setSelection(state().elements.map((el) => el.id));
    const bounds = selectionBounds(state())!;
    state().duplicateSelection();
    const els = state().elements;
    expect(els).toHaveLength(4);
    expect(new Set(els.map((el) => el.id)).size).toBe(4);
    expect(els.map((el) => el.tableNumber)).toEqual([1, 2, 3, 4]);
    expect(els[2].label).toBe("Mesa 3");
    expect(state().selectedIds).toEqual([els[2].id, els[3].id]);
    expect(selectionBounds(state())!.minX).toBeGreaterThan(bounds.maxX);
  });

  it("la matriz repite la selección en filas y columnas con la separación en metros", () => {
    state().addElement("table-round");
    state().setSelection([state().elements[0].id]);
    state().duplicateMatrix(2, 3, 1, 1.5);
    const els = state().elements;
    expect(els).toHaveLength(6);
    const xs = [...new Set(els.map((el) => Math.round(el.x)))];
    const ys = [...new Set(els.map((el) => Math.round(el.y)))];
    expect(xs).toHaveLength(3);
    expect(ys).toHaveLength(2);
    // Paso = huella (mesa + sillas) + separación.
    const footprint = shapeBox(elementShape(els[0], DEFAULT_PX_PER_METER));
    expect(els[1].x - els[0].x).toBeCloseTo(footprint.maxX - footprint.minX + DEFAULT_PX_PER_METER);
    expect(els[3].y - els[0].y).toBeCloseTo(footprint.maxY - footprint.minY + 1.5 * DEFAULT_PX_PER_METER);
  });

  it("alinear y distribuir mueven la selección en un solo paso", () => {
    state().addElement("table-round");
    state().addElement("table-round");
    state().addElement("table-round");
    state().setSelection(state().elements.map((el) => el.id));
    state().alignSelection("top");
    const ys = state().elements.map((el) => el.y);
    expect(new Set(ys).size).toBe(1);
    state().undo();
    expect(new Set(state().elements.map((el) => el.y)).size).toBeGreaterThan(1);
  });

  it("al cambiar de evento el historial empieza de cero", () => {
    state().addElement("table-round");
    expect(state().history.past.length).toBe(1);
    state().setElements([]);
    expect(state().history.past).toEqual([]);
    expect(state().selectedIds).toEqual([]);
  });
});

describe("arreglos del editor moderno", () => {
  beforeEach(() => {
    useCanvasStore.getState().setElements([], { roomFixtures: [], roomShape: [], pxPerMeter: null });
    useCanvasStore.setState({ viewCenter: { x: 1000, y: 700 } });
  });

  const state = () => useCanvasStore.getState();
  const noOverlaps = () => {
    const boxes = state().elements.map((el) => shapeBox(elementShape(el, DEFAULT_PX_PER_METER)));
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) expect(boxesIntersect(boxes[i], boxes[j])).toBe(false);
    }
  };
  const table = (i: number): LayoutElement => ({
    id: `t${i}`,
    type: "table-round",
    label: `Mesa ${i}`,
    tableNumber: i,
    x: i * 10,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    capacity: 8,
    rows: null,
    columns: null,
    fill: null,
    zIndex: i,
  });

  it("un cambio hecho mientras se guardaba no se da por guardado", () => {
    state().addElement("table-round");
    const saving = state().revision;
    // Mientras el guardado está en vuelo, el usuario mueve la mesa.
    state().setSelection([state().elements[0].id]);
    state().nudgeSelection(5, 0);
    state().markClean(saving);
    expect(state().dirty).toBe(true);
    expect(state().saveStatus).not.toBe("saved");
    // El siguiente guardado (con la revisión actual) sí lo deja limpio.
    state().markClean(state().revision);
    expect(state()).toMatchObject({ dirty: false, saveStatus: "saved" });
  });

  it("deshacer cuenta como cambio nuevo para el guardado", () => {
    state().addElement("table-round");
    const saving = state().revision;
    state().undo();
    state().markClean(saving);
    expect(state().dirty).toBe(true);
  });

  it("un guardado del evento anterior no marca como guardado el nuevo", () => {
    state().addElement("table-round");
    const old = state().revision;
    state().setElements([]);
    useCanvasStore.setState({ dirty: true });
    state().markClean(old);
    expect(state().dirty).toBe(true);
  });

  it("duplicar dos veces el mismo original no encima la segunda copia sobre la primera", () => {
    state().addElement("table-round");
    const original = state().elements[0].id;
    state().setSelection([original]);
    state().duplicateSelection();
    state().setSelection([original]);
    state().duplicateSelection();
    expect(state().elements).toHaveLength(3);
    noOverlaps();
  });

  it("la matriz se corre si caería encima de otros elementos", () => {
    state().addElement("table-round");
    const original = state().elements[0];
    // Una vecina justo donde iría la primera copia de la matriz.
    state().addElement("table-round");
    state().setSelection([original.id]);
    state().duplicateMatrix(2, 2, 1, 1);
    expect(state().elements).toHaveLength(5);
    noOverlaps();
  });

  it("las copias tampoco caen sobre paredes o columnas", () => {
    state().addElement("table-round");
    const original = state().elements[0];
    const footprint = shapeBox(elementShape(original, DEFAULT_PX_PER_METER));
    const width = footprint.maxX - footprint.minX;
    const column: RoomFixture = {
      id: "col",
      type: "column",
      label: "",
      x: original.x + width + DEFAULT_PX_PER_METER,
      y: original.y,
      width: 40,
      height: 40,
      rotation: 0,
    };
    useCanvasStore.setState({ roomFixtures: [column], selectedIds: [original.id] });
    state().duplicateSelection();
    const copy = state().elements[1];
    expect(boxesIntersect(shapeBox(elementShape(copy, DEFAULT_PX_PER_METER)), shapeBox(fixtureShape(column)))).toBe(false);
  });

  it("no deja duplicar más allá del máximo de elementos", () => {
    const many = Array.from({ length: MAX_LAYOUT_ELEMENTS - 2 }, (_, i) => table(i + 1));
    state().setElements(many);
    state().setSelection([many[0].id, many[1].id]);
    expect(state().duplicateMatrix(2, 2, 1, 1)).toBe(false);
    expect(state().elements).toHaveLength(MAX_LAYOUT_ELEMENTS - 2);
    expect(state().duplicateSelection()).toBe(true);
    expect(state().elements).toHaveLength(MAX_LAYOUT_ELEMENTS);
    expect(state().addElement("table-round")).toBe(false);
  });

  it("no deja pasar del máximo de elementos fijos del salón", () => {
    const fixtures: RoomFixture[] = Array.from({ length: MAX_ROOM_FIXTURES }, (_, i) => ({
      id: `f${i}`,
      type: "column",
      label: "",
      x: i * 50,
      y: 0,
      width: 30,
      height: 30,
      rotation: 0,
    }));
    state().setElements([], { roomFixtures: fixtures });
    state().toggleRoomEditMode();
    expect(state().addFixture("column")).toBe(false);
    state().setSelection(["f0"]);
    expect(state().duplicateSelection()).toBe(false);
    expect(state().roomFixtures).toHaveLength(MAX_ROOM_FIXTURES);
  });

  it("la matriz conserva la cuadrícula: si abajo está ocupado, crece hacia arriba", () => {
    state().addElement("table-round");
    const original = state().elements[0];
    const box = shapeBox(elementShape(original, DEFAULT_PX_PER_METER));
    // Una vecina justo debajo del original: la fila de abajo no cabe.
    state().addElement("table-round");
    const neighbor = state().elements[1];
    state().updateElement(neighbor.id, { x: original.x, y: original.y + (box.maxY - box.minY) + 40 });
    state().setSelection([original.id]);
    state().duplicateMatrix(2, 2, 1, 1);
    const copies = state().elements.slice(2);
    const xs = new Set([original.x, ...copies.map((c) => c.x)]);
    const ys = new Set([original.y, ...copies.map((c) => c.y)]);
    // 2 × 2 de verdad: dos columnas y dos filas, con el original en una esquina.
    expect(xs.size).toBe(2);
    expect(ys.size).toBe(2);
    expect(Math.min(...ys)).toBeLessThan(original.y);
    noOverlaps();
  });

  it("las copias y los elementos nuevos no se salen del lienzo", () => {
    useCanvasStore.setState({ canvasWidth: 2000, canvasHeight: 1400, viewCenter: { x: 1900, y: 700 } });
    state().addElement("table-round");
    state().setSelection([state().elements[0].id]);
    state().duplicateSelection();
    for (const el of state().elements) {
      const b = shapeBox(elementShape(el, DEFAULT_PX_PER_METER));
      expect(b.minX).toBeGreaterThanOrEqual(0);
      expect(b.maxX).toBeLessThanOrEqual(2000);
    }
    noOverlaps();
  });

  it("los elementos fijos nuevos no caen encima de las mesas", () => {
    state().addElement("table-round");
    const mesa = shapeBox(elementShape(state().elements[0], DEFAULT_PX_PER_METER));
    state().toggleRoomEditMode();
    state().addFixture("wall");
    expect(boxesIntersect(shapeBox(fixtureShape(state().roomFixtures[0])), mesa)).toBe(false);
  });

  it("borrar mesas o varios elementos pide confirmación; una zona sola, no", () => {
    state().addElement("table-round");
    state().addElement("dance-floor");
    const [mesa, pista] = state().elements;

    state().setSelection([pista.id]);
    expect(needsDeleteConfirmation(state())).toBe(false);
    state().requestDeleteSelection();
    expect(state().elements).toHaveLength(1);

    state().setSelection([mesa.id]);
    state().requestDeleteSelection();
    expect(state().pendingDelete).toBe(true);
    expect(state().elements).toHaveLength(1);
    state().cancelDeleteRequest();
    expect(state().elements).toHaveLength(1);

    state().requestDeleteSelection();
    state().deleteSelection();
    expect(state()).toMatchObject({ pendingDelete: false, elements: [] });
  });
});

describe("biblioteca de salones y calibración", () => {
  const state = () => useCanvasStore.getState();
  const plan = { url: "https://ejemplo.test/plano.png", x: 0, y: 0, width: 2000, height: 1400, opacity: 0.5 };

  beforeEach(() => {
    state().setElements([], { roomFixtures: [], roomShape: [], pxPerMeter: 100, backgroundImage: null, baseRoomVersionId: null });
    useCanvasStore.setState({ viewCenter: { x: 1000, y: 700 } });
  });

  it("carga el plano y el salón base del layout, y los reinicia al cambiar de evento", () => {
    state().setElements([], { backgroundImage: plan, baseRoomVersionId: "a".repeat(24) });
    expect(state()).toMatchObject({ backgroundImage: plan, baseRoomVersionId: "a".repeat(24), calibrationPoints: null });
    state().setElements([], {});
    expect(state()).toMatchObject({ backgroundImage: null, baseRoomVersionId: null });
  });

  it("usar un salón de la biblioteca reemplaza la capa salón sin tocar las mesas, y se puede deshacer", () => {
    state().addElement("table-round");
    const before = state().elements;
    const shape = [
      { x: 0, y: 0 },
      { x: 1500, y: 0 },
      { x: 1500, y: 900 },
    ];
    const fixture: RoomFixture = { id: "col", type: "column", label: "", x: 10, y: 10, width: 50, height: 50, rotation: 0 };
    state().applyRoomLayer(
      { roomShape: shape, roomFixtures: [fixture], pxPerMeter: 100, canvasWidth: 1600, canvasHeight: 1000, background: "garden", backgroundImage: plan },
      "b".repeat(24)
    );
    expect(state()).toMatchObject({
      roomShape: shape,
      roomFixtures: [fixture],
      canvasWidth: 1600,
      background: "garden",
      backgroundImage: plan,
      baseRoomVersionId: "b".repeat(24),
      dirty: true,
    });
    expect(state().elements).toBe(before);
    state().undo();
    expect(state()).toMatchObject({ roomShape: [], roomFixtures: [], backgroundImage: null, baseRoomVersionId: null });
  });

  it("vincular a una versión recién guardada marca para guardar sin pasar por el historial", () => {
    state().linkBaseRoomVersion("c".repeat(24));
    expect(state()).toMatchObject({ baseRoomVersionId: "c".repeat(24), dirty: true });
    expect(state().history.past).toHaveLength(0);
  });

  it("deshacer un cambio anterior al guardar en la biblioteca no pierde el vínculo recién guardado", () => {
    state().addElement("table-round");
    state().linkBaseRoomVersion("c".repeat(24));
    state().undo();
    expect(state()).toMatchObject({ elements: [], baseRoomVersionId: "c".repeat(24) });
    state().redo();
    expect(state()).toMatchObject({ baseRoomVersionId: "c".repeat(24) });
    expect(state().elements).toHaveLength(1);
  });

  it("deshacer el uso de un salón vuelve al vínculo anterior aunque luego se guarde una versión nueva", () => {
    state().applyRoomLayer(
      { roomShape: [], roomFixtures: [], pxPerMeter: 100, canvasWidth: 1600, canvasHeight: 1000, background: "indoor", backgroundImage: plan },
      "b".repeat(24)
    );
    state().addElement("table-round");
    state().linkBaseRoomVersion("d".repeat(24));
    state().undo();
    expect(state()).toMatchObject({ elements: [], baseRoomVersionId: "d".repeat(24) });
    state().undo();
    expect(state()).toMatchObject({ backgroundImage: null, baseRoomVersionId: null });
  });

  it("calibrar: dos puntos, nueva escala y las mesas conservan su tamaño real", () => {
    state().addElement("table-round");
    const width = state().elements[0].width; // 1.5 m a 100 px/m
    state().startCalibration();
    state().addCalibrationPoint({ x: 0, y: 0 });
    state().addCalibrationPoint({ x: 500, y: 0 });
    state().addCalibrationPoint({ x: 900, y: 0 });
    expect(state().calibrationPoints).toHaveLength(2);
    state().applyCalibration(50);
    expect(state()).toMatchObject({ pxPerMeter: 50, calibrationPoints: null });
    expect(state().elements[0].width).toBe(width / 2);
    state().undo();
    expect(state()).toMatchObject({ pxPerMeter: 100 });
    expect(state().elements[0].width).toBe(width);
  });

  it("deshacer una calibración en un layout sin escala guardada vuelve a la escala por defecto explícita", () => {
    state().setElements([], { pxPerMeter: null });
    state().startCalibration();
    state().applyCalibration(40);
    state().undo();
    // No null: el guardado debe escribir la escala para no dejar la calibrada en la base de datos.
    expect(state().pxPerMeter).toBe(DEFAULT_PX_PER_METER);
  });

  it("el plano de fondo se puede cambiar y quitar (con deshacer)", () => {
    state().setBackgroundImage(plan);
    state().setBackgroundImage({ ...plan, opacity: 0.8 }, "plan-opacity");
    state().setBackgroundImage({ ...plan, opacity: 0.9 }, "plan-opacity");
    state().setBackgroundImage(null);
    expect(state().backgroundImage).toBeNull();
    state().undo();
    expect(state().backgroundImage?.opacity).toBe(0.9);
  });
});
