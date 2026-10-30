import { beforeEach, describe, expect, it, vi } from "vitest";

// venueRooms es solo de servidor: se simula `server-only` y la base de datos.
vi.mock("server-only", () => ({}));
const db = vi.hoisted(() => ({
  versions: [] as { roomId: string }[],
  rooms: [] as { venueId: string }[],
  venues: [] as { visibility: string; createdById: string; weddingId: string | null }[],
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    venueRoomVersion: { findMany: vi.fn(async () => db.versions) },
    venueRoom: { findMany: vi.fn(async () => db.rooms) },
    venue: { findMany: vi.fn(async () => db.venues) },
  },
}));

const { canUsePlanUrl, sanitizeOwnedPlanImage } = await import("@/lib/venueRooms");

const MINE = "aaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER = "bbbbbbbbbbbbbbbbbbbbbbbb";
const viewer = { userId: "u1", weddingId: MINE };
const planOf = (weddingId: string) => `/api/uploads/floorplans/${weddingId}/plano.png`;
const image = (url: string) => ({ url, x: 0, y: 0, width: 800, height: 600, opacity: 0.5 });

describe("canUsePlanUrl: no se gana acceso a planos ajenos al guardar", () => {
  beforeEach(() => {
    db.versions = [];
    db.rooms = [];
    db.venues = [];
  });

  it("acepta un plano subido por la propia boda", async () => {
    expect(await canUsePlanUrl(planOf(MINE), viewer)).toBe(true);
  });

  it("rechaza el plano de otra boda que no está en ningún salón de la biblioteca", async () => {
    expect(await canUsePlanUrl(planOf(OTHER), viewer)).toBe(false);
  });

  it("rechaza el plano de otra boda usado solo por un salón privado ajeno", async () => {
    db.versions = [{ roomId: "r1" }];
    db.rooms = [{ venueId: "v1" }];
    db.venues = [{ visibility: "private", createdById: "otro", weddingId: OTHER }];
    expect(await canUsePlanUrl(planOf(OTHER), viewer)).toBe(false);
  });

  it("acepta el plano de un salón de plataforma", async () => {
    db.versions = [{ roomId: "r1" }];
    db.rooms = [{ venueId: "v1" }];
    db.venues = [{ visibility: "platform", createdById: "otro", weddingId: OTHER }];
    expect(await canUsePlanUrl(planOf(OTHER), viewer)).toBe(true);
  });

  it("rechaza URLs que no son de planos subidos", async () => {
    expect(await canUsePlanUrl("https://evil.example/plano.png", viewer)).toBe(false);
    expect(await canUsePlanUrl(`/api/uploads/receipts/${MINE}/x.png`, viewer)).toBe(false);
  });

  it("sanitizeOwnedPlanImage descarta el plano ajeno y conserva el ya guardado", async () => {
    expect(await sanitizeOwnedPlanImage(image(planOf(OTHER)), viewer)).toBeNull();
    expect(await sanitizeOwnedPlanImage(image(planOf(OTHER)), viewer, planOf(OTHER))).not.toBeNull();
    expect(await sanitizeOwnedPlanImage(image(planOf(MINE)), viewer)).not.toBeNull();
  });
});
