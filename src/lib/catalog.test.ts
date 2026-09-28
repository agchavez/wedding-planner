import { describe, expect, it } from "vitest";
import {
  CATALOG_NAME_MAX,
  cleanName,
  duplicateError,
  findSameName,
  nameKey,
  shouldOfferCreate,
  uniqueSortedLabels,
  validateCatalogName,
} from "./catalog";

describe("cleanName", () => {
  it("quita espacios al inicio, al final y repetidos", () => {
    expect(cleanName("  Flores   Bella \n")).toBe("Flores Bella");
  });
  it("devuelve vacío si no es texto", () => {
    expect(cleanName(null)).toBe("");
    expect(cleanName(undefined)).toBe("");
    expect(cleanName(42)).toBe("");
  });
});

describe("nameKey", () => {
  it("ignora mayúsculas, acentos y espacios de más", () => {
    expect(nameKey(" Música  en Vivo ")).toBe(nameKey("musica en vivo"));
    expect(nameKey("Fotografía")).toBe("fotografia");
  });
  it("distingue nombres realmente distintos", () => {
    expect(nameKey("Flores")).not.toBe(nameKey("Floristería"));
  });
});

describe("validateCatalogName", () => {
  it("acepta y limpia un nombre válido", () => {
    expect(validateCatalogName("  Catering  Real ", "vendor")).toEqual({ ok: true, name: "Catering Real" });
  });
  it("rechaza vacío o solo espacios con un mensaje según el catálogo", () => {
    expect(validateCatalogName("   ", "vendor")).toEqual({ ok: false, error: "Escribe el nombre del proveedor." });
    expect(validateCatalogName("", "account")).toEqual({ ok: false, error: "Escribe el nombre de la cuenta." });
  });
  it("rechaza nombres demasiado largos", () => {
    const result = validateCatalogName("a".repeat(CATALOG_NAME_MAX + 1), "group");
    expect(result.ok).toBe(false);
  });
  it("acepta exactamente el máximo", () => {
    expect(validateCatalogName("a".repeat(CATALOG_NAME_MAX), "category").ok).toBe(true);
  });
});

describe("findSameName", () => {
  const items = [
    { id: "1", name: "Música en vivo" },
    { id: "2", name: "Flores" },
  ];
  it("encuentra duplicados sin importar acentos ni mayúsculas", () => {
    expect(findSameName(items, "MUSICA EN VIVO")?.id).toBe("1");
  });
  it("no cuenta al propio elemento al editarlo", () => {
    expect(findSameName(items, "Flores", "2")).toBeUndefined();
    expect(findSameName(items, "Flores", "1")?.id).toBe("2");
  });
  it("devuelve undefined si no hay coincidencia", () => {
    expect(findSameName(items, "Pastel")).toBeUndefined();
  });
});

describe("duplicateError", () => {
  it("usa el género correcto de cada catálogo", () => {
    expect(duplicateError("vendor", "Flores")).toBe('Ya existe un proveedor llamado "Flores".');
    expect(duplicateError("category", "Música")).toBe('Ya existe una categoría llamada "Música".');
  });
});

describe("shouldOfferCreate", () => {
  const labels = ["Familia del novio", "Amigos de la novia"];
  it("no ofrece crear sin texto", () => {
    expect(shouldOfferCreate("", labels)).toBe(false);
    expect(shouldOfferCreate("   ", labels)).toBe(false);
  });
  it("no ofrece crear si ya existe (aunque cambien acentos o mayúsculas)", () => {
    expect(shouldOfferCreate("familia DEL novio ", labels)).toBe(false);
  });
  it("ofrece crear aunque haya coincidencias parciales", () => {
    expect(shouldOfferCreate("Familia", labels)).toBe(true);
  });
  it("no ofrece crear textos demasiado largos", () => {
    expect(shouldOfferCreate("a".repeat(CATALOG_NAME_MAX + 1), labels)).toBe(false);
  });
});

describe("uniqueSortedLabels", () => {
  it("quita duplicados equivalentes y ordena en español", () => {
    expect(uniqueSortedLabels(["Ñandú", "flores", "Flores ", "", "  ", "Árbol", "Zeta"])).toEqual([
      "Árbol",
      "flores",
      "Ñandú",
      "Zeta",
    ]);
  });
});
