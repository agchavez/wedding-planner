import { describe, expect, it } from "vitest";
import {
  DEFAULT_PX_PER_METER,
  clampMetersToPx,
  formatDimensions,
  formatMeters,
  metersToPx,
  pickScaleBarMeters,
  pxToMeters,
  resolvePxPerMeter,
  roundMeters,
  sanitizePxPerMeter,
  stepAlignedBounds,
} from "./layoutUnits";

describe("escala por defecto", () => {
  it("la mesa redonda por defecto (100 px) mide 1.5 m", () => {
    expect(pxToMeters(100)).toBeCloseTo(1.5, 10);
    expect(Math.round(metersToPx(1.5))).toBe(100);
  });
  it("el lienzo por defecto de 2000×1400 px equivale a 30 × 21 m", () => {
    expect(pxToMeters(2000)).toBeCloseTo(30, 10);
    expect(pxToMeters(1400)).toBeCloseTo(21, 10);
  });
});

describe("pxToMeters / metersToPx", () => {
  it("usan la escala del layout", () => {
    expect(pxToMeters(250, 50)).toBe(5);
    expect(metersToPx(2, 50)).toBe(100);
  });
  it("son inversas", () => {
    expect(pxToMeters(metersToPx(3.7, 80), 80)).toBeCloseTo(3.7, 10);
  });
});

describe("resolvePxPerMeter / sanitizePxPerMeter", () => {
  it("layouts sin escala usan la de por defecto", () => {
    expect(resolvePxPerMeter(null)).toBe(DEFAULT_PX_PER_METER);
    expect(resolvePxPerMeter(undefined)).toBe(DEFAULT_PX_PER_METER);
  });
  it("respeta una escala válida", () => {
    expect(resolvePxPerMeter(40)).toBe(40);
  });
  it("descarta escalas absurdas o no numéricas", () => {
    expect(sanitizePxPerMeter(0)).toBeNull();
    expect(sanitizePxPerMeter(-5)).toBeNull();
    expect(sanitizePxPerMeter(Number.NaN)).toBeNull();
    expect(sanitizePxPerMeter(Infinity)).toBeNull();
    expect(sanitizePxPerMeter("60")).toBeNull();
    expect(sanitizePxPerMeter(100000)).toBeNull();
    expect(resolvePxPerMeter(0)).toBe(DEFAULT_PX_PER_METER);
  });
});

describe("roundMeters", () => {
  it("quita el ruido de punto flotante", () => {
    expect(roundMeters(pxToMeters(120))).toBe(1.8);
    expect(roundMeters(1.23456, 1)).toBe(1.2);
  });
});

describe("formatMeters", () => {
  it("formatea en es-HN con 2 decimales por defecto", () => {
    expect(formatMeters(1.5)).toBe("1.50 m");
    expect(formatMeters(0.75)).toBe("0.75 m");
  });
  it("acepta otros decimales", () => {
    expect(formatMeters(5, 0)).toBe("5 m");
    expect(formatMeters(0.5, 1)).toBe("0.5 m");
  });
  it("no revienta con valores inválidos", () => {
    expect(formatMeters(Number.NaN)).toBe("—");
  });
});

describe("formatDimensions", () => {
  it("muestra ancho × alto en metros", () => {
    expect(formatDimensions(30, 21)).toBe("30.0 × 21.0 m");
    expect(formatDimensions(24, 24, 0)).toBe("24 × 24 m");
  });
});

describe("pickScaleBarMeters", () => {
  it("elige el paso redondo más grande que cabe en la barra", () => {
    // Zoom 100 % con la escala por defecto: 2 m ≈ 133 px.
    expect(pickScaleBarMeters(DEFAULT_PX_PER_METER)).toBe(2);
    // Zoom 25 %: 5 m ≈ 83 px, 10 m ya no cabe.
    expect(pickScaleBarMeters(DEFAULT_PX_PER_METER * 0.25)).toBe(5);
    // Zoom 250 %: 0.5 m ≈ 83 px.
    expect(pickScaleBarMeters(DEFAULT_PX_PER_METER * 2.5)).toBe(0.5);
  });
  it("nunca devuelve menos que el paso mínimo", () => {
    expect(pickScaleBarMeters(10000)).toBe(0.5);
  });
});

describe("stepAlignedBounds", () => {
  it("alinea el mínimo a un múltiplo del paso para que 0.9 o 1.5 sean válidos", () => {
    // Elemento fijo: 2 px ≈ 0.03 m → el input usa 0.05 como base de los pasos.
    const fixture = stepAlignedBounds(2, 4000, DEFAULT_PX_PER_METER, 0.05);
    expect(fixture).toEqual({ min: 0.05, max: 60 });
    for (const meters of [0.9, 1.5, 0.2, 4]) {
      const steps = (meters - fixture.min) / 0.05;
      expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-9);
    }
  });
  it("no mueve límites que ya son múltiplos del paso (ruido de punto flotante)", () => {
    // Mesas: 20 px = 0.3 m y 900 px = 13.5 m.
    expect(stepAlignedBounds(20, 900, DEFAULT_PX_PER_METER, 0.05)).toEqual({ min: 0.3, max: 13.5 });
  });
  it("el máximo se redondea hacia abajo para no pasarse del límite real", () => {
    expect(stepAlignedBounds(2, 4000, 37, 0.05).max).toBe(108.1);
  });
});

describe("clampMetersToPx", () => {
  it("convierte metros a píxeles sin ajustar si están dentro de los límites", () => {
    expect(clampMetersToPx(1.5, 100, 20, 900)).toEqual({ px: 150, clamped: false });
  });
  it("ajusta a los límites e indica que hubo ajuste", () => {
    expect(clampMetersToPx(20, DEFAULT_PX_PER_METER, 20, 900)).toEqual({ px: 900, clamped: true });
    expect(clampMetersToPx(0.1, DEFAULT_PX_PER_METER, 20, 900)).toEqual({ px: 20, clamped: true });
  });
});
