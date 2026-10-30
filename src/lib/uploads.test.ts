import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { isSafeUploadPath } = await import("@/lib/uploads");

const BODA = "aaaaaaaaaaaaaaaaaaaaaaaa";

describe("isSafeUploadPath", () => {
  it("acepta un plano y un comprobante normales", () => {
    expect(isSafeUploadPath(["floorplans", BODA, "plano.png"])).toBe(true);
    expect(isSafeUploadPath(["receipts", "x.pdf"])).toBe(true);
  });

  it("rechaza saltos de carpeta que cambiarían el archivo autorizado", () => {
    expect(isSafeUploadPath(["floorplans", BODA, "..", "..", "receipts", "x.pdf"])).toBe(false);
    expect(isSafeUploadPath(["floorplans", BODA, ".", "plano.png"])).toBe(false);
    expect(isSafeUploadPath(["floorplans", BODA, "a/../../x.pdf"])).toBe(false);
    expect(isSafeUploadPath(["floorplans", BODA, "a\\..\\x.pdf"])).toBe(false);
    expect(isSafeUploadPath(["receipts", "..", "floorplans", BODA, "p.png"])).toBe(false);
  });

  it("exige la forma floorplans/<boda>/<archivo>", () => {
    expect(isSafeUploadPath(["floorplans", "no-es-id", "p.png"])).toBe(false);
    expect(isSafeUploadPath(["floorplans", BODA])).toBe(false);
    expect(isSafeUploadPath(["floorplans", BODA, "sub", "p.png"])).toBe(false);
    expect(isSafeUploadPath([])).toBe(false);
    expect(isSafeUploadPath(["floorplans", BODA, ""])).toBe(false);
  });
});
