import { describe, expect, it } from "vitest";
import { FIXTURE_TYPES, MAX_ROOM_FIXTURES, getDefaultFixtureSize, sanitizeRoomFixture, sanitizeRoomFixtures } from "./roomFixtures";
import { DEFAULT_PX_PER_METER, pxToMeters, roundMeters } from "./layoutUnits";

const wall = { id: "w1", type: "wall", label: "Pared norte", x: 100, y: 50, width: 267, height: 13, rotation: 90 };

describe("getDefaultFixtureSize", () => {
  it("convierte las medidas en metros con la escala del layout", () => {
    // Pared de 4 × 0.2 m con la escala por defecto (≈66.67 px/m).
    const wallSize = getDefaultFixtureSize("wall");
    expect(wallSize.width).toBeCloseTo(266.667, 3);
    expect(wallSize.height).toBeCloseTo(13.333, 3);
    expect(getDefaultFixtureSize("column", 100)).toEqual({ width: 50, height: 50 });
  });
  it("vuelve a los mismos metros al mostrarse (sin redondear a píxel entero)", () => {
    const shown = (px: number) => roundMeters(pxToMeters(px, DEFAULT_PX_PER_METER));
    expect(shown(getDefaultFixtureSize("wall").width)).toBe(4);
    expect(shown(getDefaultFixtureSize("wall").height)).toBe(0.2);
    expect(shown(getDefaultFixtureSize("column").width)).toBe(0.5);
    for (const type of FIXTURE_TYPES) {
      for (const pxPerMeter of [DEFAULT_PX_PER_METER, 37, 100]) {
        const size = getDefaultFixtureSize(type, pxPerMeter);
        const meters = getDefaultFixtureSize(type, 1);
        expect(roundMeters(pxToMeters(size.width, pxPerMeter))).toBe(roundMeters(meters.width));
        expect(roundMeters(pxToMeters(size.height, pxPerMeter))).toBe(roundMeters(meters.height));
      }
    }
  });
});

describe("sanitizeRoomFixture", () => {
  it("conserva un elemento válido", () => {
    expect(sanitizeRoomFixture(wall)).toEqual(wall);
  });
  it("descarta tipos desconocidos, ids vacíos y basura", () => {
    expect(sanitizeRoomFixture({ ...wall, type: "table-round" })).toBeNull();
    expect(sanitizeRoomFixture({ ...wall, id: "" })).toBeNull();
    expect(sanitizeRoomFixture({ ...wall, id: 42 })).toBeNull();
    expect(sanitizeRoomFixture(null)).toBeNull();
    expect(sanitizeRoomFixture("pared")).toBeNull();
  });
  it("corrige números no finitos y fuera de rango", () => {
    const fixed = sanitizeRoomFixture({ ...wall, x: Number.NaN, y: 1e9, width: -10, height: Infinity, rotation: "a" });
    expect(fixed).toMatchObject({ x: 0, y: 6000, width: 2, height: 2, rotation: 0 });
  });
  it("recorta la etiqueta y la normaliza a texto", () => {
    expect(sanitizeRoomFixture({ ...wall, label: "x".repeat(100) })?.label).toHaveLength(60);
    expect(sanitizeRoomFixture({ ...wall, label: undefined })?.label).toBe("");
  });
});

describe("sanitizeRoomFixtures", () => {
  it("layouts viejos sin roomFixtures quedan con lista vacía", () => {
    expect(sanitizeRoomFixtures(undefined)).toEqual([]);
    expect(sanitizeRoomFixtures(null)).toEqual([]);
  });
  it("quita ids repetidos e inválidos", () => {
    const result = sanitizeRoomFixtures([wall, { ...wall, x: 5 }, { ...wall, id: "w2", type: "?" }, { ...wall, id: "c1", type: "column" }]);
    expect(result.map((f) => f.id)).toEqual(["w1", "c1"]);
    expect(result[0].x).toBe(100);
  });
  it("limita la cantidad", () => {
    const many = Array.from({ length: MAX_ROOM_FIXTURES + 20 }, (_, i) => ({ ...wall, id: `w${i}` }));
    expect(sanitizeRoomFixtures(many)).toHaveLength(MAX_ROOM_FIXTURES);
  });
});
