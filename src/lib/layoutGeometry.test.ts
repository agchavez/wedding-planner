import { describe, expect, it } from "vitest";
import {
  alignShapes,
  boxesIntersect,
  computeSnap,
  distributeShapes,
  findFreeOffset,
  findFreeSpot,
  matrixOffsets,
  nearestGap,
  shapeBox,
  unionBox,
  type Box,
  type PlacedShape,
} from "./layoutGeometry";

const box = (minX: number, minY: number, maxX: number, maxY: number): Box => ({ minX, minY, maxX, maxY });
const rect = (id: string, x: number, y: number, width = 20, height = 20, rotation = 0): PlacedShape => ({
  id,
  x,
  y,
  width,
  height,
  rotation,
});

describe("shapeBox", () => {
  it("centra la caja en (x, y) y la agranda al rotar", () => {
    expect(shapeBox(rect("a", 100, 50, 40, 20))).toEqual(box(80, 40, 120, 60));
    const rotated = shapeBox(rect("a", 0, 0, 40, 20, 90));
    expect(rotated.maxX).toBeCloseTo(10);
    expect(rotated.maxY).toBeCloseTo(20);
  });

  it("un círculo no cambia al rotar", () => {
    expect(shapeBox({ ...rect("a", 0, 0, 50, 50, 37), round: true })).toEqual(box(-25, -25, 25, 25));
  });
});

describe("computeSnap", () => {
  it("alinea el borde izquierdo con el de otro elemento dentro del umbral", () => {
    const result = computeSnap(box(103, 200, 123, 220), [box(100, 0, 120, 20)], 8);
    expect(result.dx).toBe(-3);
    expect(result.dy).toBe(0);
    expect(result.guides.some((g) => g.x1 === 100 && g.x2 === 100)).toBe(true);
  });

  it("alinea centros y no ajusta si está lejos", () => {
    expect(computeSnap(box(0, 97, 20, 117), [box(100, 90, 140, 130)], 8).dy).toBe(3);
    expect(computeSnap(box(0, 0, 20, 20), [box(100, 100, 120, 120)], 8)).toMatchObject({ dx: 0, dy: 0, guides: [] });
  });

  it("el umbral es en píxeles del lienzo: a más zoom, quien llama pasa uno menor", () => {
    const moving = box(105, 300, 125, 320);
    const target = [box(100, 0, 120, 20)];
    expect(computeSnap(moving, target, 8 / 1).dx).toBe(-5);
    expect(computeSnap(moving, target, 8 / 2).dx).toBe(0);
  });
});

describe("nearestGap", () => {
  it("mide el hueco libre hasta el vecino enfrentado más cercano", () => {
    const gap = nearestGap(box(0, 0, 10, 10), [box(30, 2, 40, 8), box(0, 50, 10, 60), box(100, 100, 110, 110)]);
    expect(gap).toMatchObject({ x1: 10, x2: 30, distance: 20 });
  });

  it("ignora vecinos que no se enfrentan o están demasiado lejos", () => {
    expect(nearestGap(box(0, 0, 10, 10), [box(30, 30, 40, 40)])).toBeNull();
    expect(nearestGap(box(0, 0, 10, 10), [box(0, 100, 10, 110)], 50)).toBeNull();
  });
});

describe("alinear y distribuir", () => {
  const shapes = [rect("a", 10, 10, 20, 20), rect("b", 100, 40, 40, 40), rect("c", 50, 200, 20, 20)];

  it("alinea a la izquierda por los bordes, no por los centros", () => {
    const result = alignShapes(shapes, "left");
    expect(result.map((p) => p.x)).toEqual([10, 20, 10]);
    expect(result.map((p) => p.y)).toEqual([10, 40, 200]);
  });

  it("centra en vertical respecto de la caja de la selección", () => {
    const all = unionBox(shapes.map(shapeBox))!;
    const middle = (all.minY + all.maxY) / 2;
    for (const p of alignShapes(shapes, "middle")) expect(p.y).toBe(middle);
  });

  it("distribuye con el mismo espacio libre y deja fijos los extremos", () => {
    const row = [rect("a", 0, 0, 20, 20), rect("b", 30, 0, 40, 20), rect("c", 200, 0, 20, 20)];
    const result = distributeShapes(row, "horizontal");
    expect(result[0].x).toBe(0);
    expect(result[2].x).toBe(200);
    const boxes = result.map((p, i) => shapeBox({ ...row[i], x: p.x }));
    expect(boxes[1].minX - boxes[0].maxX).toBeCloseTo(boxes[2].minX - boxes[1].maxX);
  });

  it("con menos de 3 no distribuye", () => {
    expect(distributeShapes(shapes.slice(0, 2), "vertical").map((p) => p.y)).toEqual([10, 40]);
  });
});

describe("matrixOffsets", () => {
  it("genera filas × columnas − 1 desplazamientos por filas", () => {
    expect(matrixOffsets(2, 3, 10, 20)).toEqual([
      { dx: 10, dy: 0 },
      { dx: 20, dy: 0 },
      { dx: 0, dy: 20 },
      { dx: 10, dy: 20 },
      { dx: 20, dy: 20 },
    ]);
    expect(matrixOffsets(1, 1, 10, 10)).toEqual([]);
  });
});

describe("findFreeSpot", () => {
  it("usa el centro si está libre", () => {
    expect(findFreeSpot({ x: 500, y: 500 }, 100, 100, [])).toEqual({ x: 500, y: 500 });
  });

  it("no apila: si el centro está ocupado busca el hueco más cercano", () => {
    const occupied = [box(450, 450, 550, 550)];
    const spot = findFreeSpot({ x: 500, y: 500 }, 100, 100, occupied, 10);
    const placed = box(spot.x - 50, spot.y - 50, spot.x + 50, spot.y + 50);
    expect(boxesIntersect(placed, occupied[0])).toBe(false);
    expect(Math.hypot(spot.x - 500, spot.y - 500)).toBeCloseTo(110);
  });

  it("varios elementos seguidos quedan cada uno en un lugar distinto", () => {
    const occupied: Box[] = [];
    for (let i = 0; i < 12; i++) {
      const spot = findFreeSpot({ x: 0, y: 0 }, 50, 50, occupied, 5);
      const placed = box(spot.x - 25, spot.y - 25, spot.x + 25, spot.y + 25);
      expect(occupied.some((o) => boxesIntersect(placed, o))).toBe(false);
      occupied.push(placed);
    }
  });
});

describe("findFreeOffset", () => {
  it("no mueve el grupo si ya está libre", () => {
    expect(findFreeOffset([box(0, 0, 10, 10), box(20, 0, 30, 10)], [box(100, 100, 110, 110)], 40, 20)).toEqual({ dx: 0, dy: 0 });
  });

  it("mueve todo el grupo junto al siguiente hueco libre, prefiriendo la derecha", () => {
    // Las copias caerían encima de un elemento existente: el grupo se corre un paso a la derecha.
    const offset = findFreeOffset([box(100, 0, 150, 50)], [box(0, 0, 50, 50), box(100, 0, 150, 50)], 100, 100);
    expect(offset).toEqual({ dx: 100, dy: 0 });
  });

  it("revisa cada caja del grupo por separado (no la caja que las encierra)", () => {
    // Un hueco en medio de la matriz no la obliga a moverse.
    const copies = [box(0, 0, 10, 10), box(40, 0, 50, 10)];
    expect(findFreeOffset(copies, [box(20, 0, 30, 10)], 60, 20)).toEqual({ dx: 0, dy: 0 });
  });

  it("con límites, nunca deja una caja fuera", () => {
    const bounds = box(0, 0, 300, 300);
    const offset = findFreeOffset([box(250, 0, 300, 50)], [box(250, 0, 300, 50)], 60, 60, bounds)!;
    const moved = { minX: 250 + offset.dx, minY: offset.dy, maxX: 300 + offset.dx, maxY: 50 + offset.dy };
    expect(moved.minX).toBeGreaterThanOrEqual(0);
    expect(moved.maxX).toBeLessThanOrEqual(300);
    expect(moved.minY).toBeGreaterThanOrEqual(0);
  });

  it("devuelve null si no hay hueco", () => {
    expect(findFreeOffset([box(0, 0, 10, 10)], [box(-1000, -1000, 1000, 1000)], 10, 10)).toBeNull();
  });
});

describe("findFreeSpot con límites", () => {
  it("muchos elementos alrededor del centro no se salen del lienzo", () => {
    const bounds = box(0, 0, 2000, 1400);
    const occupied: Box[] = [];
    for (let i = 0; i < 30; i++) {
      const spot = findFreeSpot({ x: 1000, y: 700 }, 200, 200, occupied, 20, bounds);
      const placed = box(spot.x - 100, spot.y - 100, spot.x + 100, spot.y + 100);
      expect(placed.minX).toBeGreaterThanOrEqual(0);
      expect(placed.minY).toBeGreaterThanOrEqual(0);
      expect(placed.maxX).toBeLessThanOrEqual(2000);
      expect(placed.maxY).toBeLessThanOrEqual(1400);
      occupied.push(placed);
    }
  });
});
