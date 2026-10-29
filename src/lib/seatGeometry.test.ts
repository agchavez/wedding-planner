import { describe, expect, it } from "vitest";
import { computeSeatPositions, getChairMetrics, getDefaultElementShape, getElementFootprint, TOOL_GROUPS } from "./seatGeometry";
import { DEFAULT_PX_PER_METER, pxToMeters, roundMeters } from "./layoutUnits";

describe("getDefaultElementShape", () => {
  it("define las medidas en metros (redonda 1.5 m, rectangular 1.8 × 0.75 m)", () => {
    const round = getDefaultElementShape("table-round");
    expect(round.width).toBeCloseTo(100, 6);
    expect(roundMeters(pxToMeters(round.width))).toBe(1.5);
    const rect = getDefaultElementShape("table-rectangular", 100);
    expect(rect).toMatchObject({ width: 180, height: 75, capacity: 8 });
  });

  it("vuelve a los mismos metros al mostrarse (sin redondear a píxel entero)", () => {
    const shown = (px: number, pxPerMeter: number) => roundMeters(pxToMeters(px, pxPerMeter));
    expect(shown(getDefaultElementShape("dance-floor").width, DEFAULT_PX_PER_METER)).toBe(5);
    expect(shown(getDefaultElementShape("stage").width, DEFAULT_PX_PER_METER)).toBe(4);
    expect(shown(getDefaultElementShape("photo-area").width, DEFAULT_PX_PER_METER)).toBe(2.5);
    expect(shown(getDefaultElementShape("chair-row").width, DEFAULT_PX_PER_METER)).toBe(2.75);
    for (const type of TOOL_GROUPS.flatMap((g) => g.types)) {
      for (const pxPerMeter of [DEFAULT_PX_PER_METER, 37, 100]) {
        const shape = getDefaultElementShape(type, pxPerMeter);
        const meters = getDefaultElementShape(type, 1);
        expect(shown(shape.width, pxPerMeter)).toBe(roundMeters(meters.width));
        expect(shown(shape.height, pxPerMeter)).toBe(roundMeters(meters.height));
      }
    }
  });
});

describe("sillas a escala real", () => {
  it("miden ≈0.45 m según la escala del layout", () => {
    const def = getChairMetrics();
    expect(def.radius * 2).toBeCloseTo(0.45 * DEFAULT_PX_PER_METER);
    // Con la escala por defecto la silla queda a los mismos 20 px del borde de siempre.
    expect(def.offset).toBeCloseTo(20);
    expect(getChairMetrics(100).radius).toBeCloseTo(22.5);
  });

  it("la huella de una mesa incluye sus sillas", () => {
    const { radius, offset } = getChairMetrics(100);
    expect(getElementFootprint({ type: "table-round", width: 150, height: 150, capacity: 8 }, 100)).toEqual({
      width: 150 + 2 * (offset + radius),
      height: 150 + 2 * (offset + radius),
      round: true,
    });
    expect(getElementFootprint({ type: "table-rectangular", width: 180, height: 75, capacity: 8 }, 100).width).toBe(180);
    expect(getElementFootprint({ type: "dance-floor", width: 500, height: 400, capacity: null }, 100)).toEqual({
      width: 500,
      height: 400,
      round: false,
    });
  });

  it("las sillas se colocan con la separación indicada", () => {
    const [first] = computeSeatPositions("table-round", 100, 100, 4, 30);
    expect(first).toMatchObject({ x: expect.closeTo(0), y: expect.closeTo(-80) });
  });
});
