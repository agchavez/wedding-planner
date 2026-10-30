import { describe, expect, it } from "vitest";
import type { LayoutElement, RoomFixture } from "@/generated/prisma";
import {
  banquetCapacityStatus,
  calibrateScale,
  convexPolygonsOverlap,
  findRoomConflicts,
  fitPlanImage,
  hasRoomContent,
  isAllowedPlanUrl,
  layerSizeMeters,
  parseCapacity,
  parseVisibility,
  planUploadWeddingId,
  pointInPolygon,
  rescaleElementSizes,
  sanitizePlanImage,
  scaledRoomLayerIssue,
  scaleRoomLayer,
  seatedPeople,
  type RoomLayer,
} from "./venueLibrary";

// Escala sencilla para las cuentas: 100 px = 1 m.
const PX = 100;
const WEDDING = "a1b2c3d4e5f6a1b2c3d4e5f6";
const PLAN_URL = `/api/uploads/floorplans/${WEDDING}/0b5c-plano.png`;

function table(id: string, x: number, y: number, extra: Partial<LayoutElement> = {}): LayoutElement {
  // Mesa redonda de 1.5 m; capacity 0 = sin sillas (la huella es solo la mesa).
  return {
    id,
    type: "table-round",
    label: `Mesa ${id}`,
    tableNumber: 1,
    x,
    y,
    width: 150,
    height: 150,
    rotation: 0,
    capacity: 0,
    rows: null,
    columns: null,
    fill: null,
    zIndex: 0,
    ...extra,
  };
}

function fixture(id: string, type: string, x: number, y: number, width: number, height: number, rotation = 0): RoomFixture {
  return { id, type, label: "", x, y, width, height, rotation };
}

function layer(extra: Partial<RoomLayer> = {}): RoomLayer {
  return {
    // Salón de 20 × 10 m.
    roomShape: [
      { x: 0, y: 0 },
      { x: 2000, y: 0 },
      { x: 2000, y: 1000 },
      { x: 0, y: 1000 },
    ],
    roomFixtures: [],
    pxPerMeter: PX,
    canvasWidth: 2200,
    canvasHeight: 1200,
    background: "indoor",
    backgroundImage: null,
    ...extra,
  };
}

describe("calibrateScale", () => {
  it("calcula los px por metro a partir de dos puntos y la distancia real", () => {
    expect(calibrateScale({ x: 0, y: 0 }, { x: 300, y: 400 }, 10)).toEqual({ ok: true, pxPerMeter: 50 });
  });
  it("rechaza metros inválidos, puntos muy juntos y escalas fuera de rango", () => {
    expect(calibrateScale({ x: 0, y: 0 }, { x: 500, y: 0 }, 0).ok).toBe(false);
    expect(calibrateScale({ x: 0, y: 0 }, { x: 500, y: 0 }, Number.NaN).ok).toBe(false);
    expect(calibrateScale({ x: 0, y: 0 }, { x: 3, y: 4 }, 1).ok).toBe(false);
    // 500 px en 100 m = 5 px/m (< mínimo de 10).
    expect(calibrateScale({ x: 0, y: 0 }, { x: 500, y: 0 }, 100).ok).toBe(false);
    // 3000 px en 1 m = 3000 px/m (> máximo de 500).
    expect(calibrateScale({ x: 0, y: 0 }, { x: 3000, y: 0 }, 1).ok).toBe(false);
  });
});

describe("rescaleElementSizes", () => {
  it("conserva el tamaño real de las mesas al cambiar la escala, sin mover sus centros", () => {
    const [el] = rescaleElementSizes([table("a", 300, 400)], 100, 50);
    expect(el.width).toBe(75);
    expect(el.height).toBe(75);
    expect(el.x).toBe(300);
    expect(el.y).toBe(400);
  });
  it("respeta los límites de tamaño del servidor y no cambia nada con la misma escala", () => {
    const els = [table("a", 0, 0)];
    expect(rescaleElementSizes(els, 100, 100)).toBe(els);
    expect(rescaleElementSizes(els, 100, 10)[0].width).toBe(20);
    expect(rescaleElementSizes(els, 10, 500)[0].width).toBe(900);
  });
});

describe("scaleRoomLayer", () => {
  it("convierte contorno, elementos fijos, lienzo y plano a otra escala conservando los metros", () => {
    const source = layer({
      roomFixtures: [fixture("c", "column", 1000, 500, 50, 50)],
      backgroundImage: { url: PLAN_URL, x: 10, y: 20, width: 2000, height: 1000, opacity: 0.5 },
    });
    const scaled = scaleRoomLayer(source, 50);
    expect(scaled.pxPerMeter).toBe(50);
    expect(scaled.roomShape[2]).toEqual({ x: 1000, y: 500 });
    expect(scaled.roomFixtures[0]).toMatchObject({ x: 500, y: 250, width: 25, height: 25, id: "c" });
    expect(scaled.canvasWidth).toBe(1100);
    // El lienzo nunca baja del mínimo del servidor.
    expect(scaled.canvasHeight).toBe(800);
    expect(scaled.backgroundImage).toMatchObject({ x: 5, y: 10, width: 1000, height: 500, opacity: 0.5 });
    expect(layerSizeMeters(scaled)).toEqual(layerSizeMeters(source));
  });
  it("no toca la capa si la escala es la misma", () => {
    const source = layer();
    expect(scaleRoomLayer(source, PX).roomShape).toBe(source.roomShape);
  });
});

describe("scaledRoomLayerIssue", () => {
  it("acepta la capa si cabe en los límites del servidor a la escala nueva", () => {
    expect(scaledRoomLayerIssue(layer(), PX)).toBeNull();
    expect(scaledRoomLayerIssue(layer(), 50)).toBeNull();
    // 20 × 10 m a 150 px/m = 3000 × 1500 px: el lienzo (3300 px) todavía cabe.
    expect(scaledRoomLayerIssue(layer(), 150)).toBeNull();
  });
  it("avisa si el salón se recortaría al guardarlo", () => {
    // Salón de 100 m guardado a 20 px/m usado a la escala por defecto (≈66.67 px/m): ~6667 px.
    const big = layer({
      pxPerMeter: 20,
      canvasWidth: 2100,
      canvasHeight: 1000,
      roomShape: [
        { x: 0, y: 0 },
        { x: 2000, y: 0 },
        { x: 2000, y: 900 },
        { x: 0, y: 900 },
      ],
    });
    expect(scaledRoomLayerIssue(big, 100 / 1.5)).toMatch(/no cabe/);
    // Un elemento fijo que pasaría del tamaño máximo.
    const wall = layer({ roomShape: [], canvasWidth: 1000, canvasHeight: 1000, roomFixtures: [fixture("w", "wall", 500, 500, 1000, 10)] });
    expect(scaledRoomLayerIssue(wall, 500)).toMatch(/no cabe/);
    // Coordenadas negativas fuera del rango del servidor.
    const negative = layer({ roomFixtures: [fixture("c", "column", -500, 100, 10, 10)] });
    expect(scaledRoomLayerIssue(negative, 500)).toMatch(/no cabe/);
  });
});

describe("geometría", () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  it("pointInPolygon", () => {
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
    expect(pointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
  });
  it("convexPolygonsOverlap distingue encimar de solo tocarse", () => {
    const moved = (dx: number) => square.map((p) => ({ x: p.x + dx, y: p.y }));
    expect(convexPolygonsOverlap(square, moved(5))).toBe(true);
    expect(convexPolygonsOverlap(square, moved(10))).toBe(false);
    expect(convexPolygonsOverlap(square, moved(9.995), 0.01)).toBe(false);
  });
});

describe("findRoomConflicts", () => {
  it("sin choques para una mesa dentro del salón y lejos de todo", () => {
    expect(findRoomConflicts([table("a", 1000, 500)], layer())).toEqual([]);
  });

  it("detecta mesas fuera del contorno", () => {
    const conflicts = findRoomConflicts([table("a", 1990, 500), table("b", 1000, 500)], layer());
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ elementId: "a", kind: "outside" });
  });

  it("detecta una esquina de un salón en L que atraviesa la mesa", () => {
    // L: falta el cuadrante de arriba a la derecha (x > 1000, y < 500).
    const lShape = [
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      { x: 1000, y: 500 },
      { x: 2000, y: 500 },
      { x: 2000, y: 1000 },
      { x: 0, y: 1000 },
    ];
    const conflicts = findRoomConflicts([table("a", 1000, 500, { type: "table-rectangular", width: 300, height: 300 })], layer({ roomShape: lShape }));
    expect(conflicts.map((c) => c.kind)).toEqual(["outside"]);
  });

  it("usa el lienzo como límite si no hay contorno", () => {
    const conflicts = findRoomConflicts([table("a", 2190, 600)], layer({ roomShape: [] }));
    expect(conflicts[0]?.kind).toBe("outside");
  });

  it("detecta mesas encima de columnas, paredes o el bar (también rotados)", () => {
    const l = layer({
      roomFixtures: [
        fixture("col", "column", 500, 500, 50, 50),
        fixture("bar", "bar", 1500, 500, 300, 80, 45),
        fixture("win", "window", 1000, 200, 150, 15),
      ],
    });
    const conflicts = findRoomConflicts([table("a", 520, 520), table("b", 1500, 600), table("c", 1000, 220)], l);
    expect(conflicts.map((c) => [c.elementId, c.kind, c.fixtureId])).toEqual([
      ["a", "overlap", "col"],
      ["b", "overlap", "bar"],
    ]);
    expect(conflicts[1].message).toContain("el bar fijo");
  });

  it("detecta mesas que tapan una puerta o salida (con 1 m libre delante)", () => {
    // Puerta en la pared de abajo: la mesa a 0.9 m de ella la tapa; a 1.5 m, no.
    const l = layer({ roomFixtures: [fixture("door", "emergency-exit", 1000, 1000, 120, 20)] });
    const near = findRoomConflicts([table("a", 1000, 1000 - 10 - 75 - 85)], l);
    expect(near.map((c) => c.kind)).toEqual(["blocks-exit"]);
    const far = findRoomConflicts([table("a", 1000, 1000 - 10 - 75 - 160)], l);
    expect(far).toEqual([]);
  });

  it("cuenta las sillas en la huella y solo revisa mesas y bloques de sillas", () => {
    const l = layer({ roomFixtures: [fixture("col", "column", 1000, 400, 40, 40)] });
    // Mesa de 1.5 m con 8 sillas: la huella llega ~1.27 m del centro.
    const seated = table("a", 1000, 520, { capacity: 8 });
    expect(findRoomConflicts([seated], l)).toHaveLength(1);
    expect(findRoomConflicts([{ ...seated, capacity: 0 }], l)).toHaveLength(0);
    const dance = { ...seated, id: "z", type: "dance-floor", capacity: null };
    expect(findRoomConflicts([dance], l)).toEqual([]);
  });
});

describe("aforo", () => {
  it("suma invitados y acompañantes sentados en mesas de este plano", () => {
    const elements = [table("a", 0, 0), { ...table("s", 0, 0), type: "stage" }];
    const guests = [
      { tableElementId: "a", plusOnes: 2 },
      { tableElementId: "a", plusOnes: 0 },
      { tableElementId: "otra", plusOnes: 5 },
      { tableElementId: null, plusOnes: 1 },
      { tableElementId: "s", plusOnes: 1 },
    ];
    expect(seatedPeople(elements, guests)).toBe(4);
  });
  it("avisa solo si se pasa del aforo de banquete declarado", () => {
    expect(banquetCapacityStatus(null, 300)).toBeNull();
    expect(banquetCapacityStatus(200, 150)).toMatchObject({ over: false });
    const over = banquetCapacityStatus(200, 230);
    expect(over).toMatchObject({ over: true, capacity: 200, seated: 230 });
    expect(over?.message).toContain("30 de más");
  });
});

describe("plano de fondo y validaciones", () => {
  it("solo acepta planos subidos a la app (nunca enlaces externos)", () => {
    expect(isAllowedPlanUrl(PLAN_URL)).toBe(true);
    expect(isAllowedPlanUrl("/api/uploads/floorplans/abc/plano.png")).toBe(false);
    expect(isAllowedPlanUrl(`/api/uploads/floorplans/${WEDDING}/sub/plano.png`)).toBe(false);
    expect(isAllowedPlanUrl("https://ejemplo.com/plano.jpg")).toBe(false);
    expect(isAllowedPlanUrl(`https://ejemplo.com${PLAN_URL}`)).toBe(false);
    expect(isAllowedPlanUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedPlanUrl("data:image/png;base64,xx")).toBe(false);
    expect(isAllowedPlanUrl("/api/uploads/floorplans/../receipts/x.pdf")).toBe(false);
    expect(isAllowedPlanUrl("/api/uploads/receipts/x.pdf")).toBe(false);
  });
  it("planUploadWeddingId saca la boda dueña del plano", () => {
    expect(planUploadWeddingId(PLAN_URL)).toBe(WEDDING);
    expect(planUploadWeddingId(PLAN_URL.toUpperCase().replace("/API/UPLOADS/FLOORPLANS/", "/api/uploads/floorplans/"))).toBe(WEDDING);
    expect(planUploadWeddingId("https://ejemplo.com/plano.jpg")).toBeNull();
    expect(planUploadWeddingId(null)).toBeNull();
  });
  it("sanitizePlanImage completa valores por defecto y descarta lo inválido", () => {
    expect(sanitizePlanImage({ url: PLAN_URL, width: 100, height: 50 })).toEqual({
      url: PLAN_URL,
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      opacity: 0.5,
    });
    expect(sanitizePlanImage({ url: PLAN_URL, width: 100, height: 50, opacity: 5 })?.opacity).toBe(1);
    expect(sanitizePlanImage({ url: "ftp://a.test/p.png", width: 100, height: 50 })).toBeNull();
    expect(sanitizePlanImage({ url: "https://a.test/p.png", width: 100, height: 50 })).toBeNull();
    expect(sanitizePlanImage({ url: PLAN_URL, width: 0, height: 50 })).toBeNull();
    expect(sanitizePlanImage(null)).toBeNull();
  });
  it("fitPlanImage encaja y centra el plano sin deformarlo", () => {
    expect(fitPlanImage("u", 1000, 1000, 2000, 1400)).toEqual({ url: "u", x: 300, y: 0, width: 1400, height: 1400, opacity: 0.5 });
  });
  it("parseCapacity, parseVisibility y hasRoomContent", () => {
    expect(parseCapacity("180")).toBe(180);
    expect(parseCapacity("")).toBeNull();
    expect(parseCapacity("-3")).toBeNull();
    expect(parseCapacity(12.6)).toBe(13);
    expect(parseVisibility("platform")).toBe("platform");
    expect(parseVisibility("otra")).toBe("private");
    expect(hasRoomContent({ roomShape: [], roomFixtures: [], backgroundImage: null })).toBe(false);
    expect(hasRoomContent(layer())).toBe(true);
  });
});
