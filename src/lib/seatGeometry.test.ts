import { describe, expect, it } from "vitest";
import { getDefaultElementShape, TOOL_GROUPS } from "./seatGeometry";
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
