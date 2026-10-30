import { describe, expect, it } from "vitest";
import {
  findFreeBlock,
  findSeatAt,
  guestInitials,
  isSameSeat,
  matchesGuestSearch,
  noRoomMessage,
  partySize,
  planSeat,
  resolveTableSeats,
  seatColorSlot,
  seatPlanMessage,
  seatWorldPosition,
  sortedGroups,
  tableSeatLayout,
} from "./guestSeating";

const g = (id: string, plusOnes = 0, seatIndex: number | null = null) => ({ id, plusOnes, seatIndex });

describe("partySize", () => {
  it("cuenta al invitado más sus acompañantes", () => {
    expect(partySize({ plusOnes: 0 })).toBe(1);
    expect(partySize({ plusOnes: 2 })).toBe(3);
    expect(partySize({ plusOnes: -1 })).toBe(1);
  });
});

describe("resolveTableSeats", () => {
  it("respeta la silla guardada y pone al grupo en sillas consecutivas", () => {
    const { seats, starts, overflow } = resolveTableSeats(8, [g("a", 1, 3), g("b", 0, 0)]);
    expect(starts).toEqual({ a: 3, b: 0 });
    expect(seats[3]).toEqual({ guestId: "a", companion: 0 });
    expect(seats[4]).toEqual({ guestId: "a", companion: 1 });
    expect(overflow).toEqual([]);
  });

  it("acomoda a los que no tienen silla en el primer bloque libre", () => {
    const { starts } = resolveTableSeats(6, [g("a", 0, 0), g("b", 1), g("c")]);
    expect(starts).toEqual({ a: 0, b: 1, c: 3 });
  });

  it("da la vuelta a la mesa: la última silla y la primera son vecinas", () => {
    const { seats } = resolveTableSeats(4, [g("a", 1, 3)]);
    expect(seats[3]?.guestId).toBe("a");
    expect(seats[0]).toEqual({ guestId: "a", companion: 1 });
  });

  it("si dos chocan, el segundo se reacomoda en vez de desaparecer", () => {
    const { starts } = resolveTableSeats(4, [g("a", 0, 1), g("b", 0, 1)]);
    expect(starts.a).toBe(1);
    expect(starts.b).toBe(0);
  });

  it("ignora sillas guardadas fuera de rango (se bajó la capacidad)", () => {
    const { starts, overflow } = resolveTableSeats(2, [g("a", 0, 7)]);
    expect(starts.a).toBe(0);
    expect(overflow).toEqual([]);
  });

  it("deja fuera a quien ya no cabe", () => {
    const { overflow } = resolveTableSeats(2, [g("a", 1), g("b")]);
    expect(overflow).toEqual(["b"]);
  });

  it("sienta separados a un grupo si no hay bloque junto pero sí sillas", () => {
    const { seats, overflow } = resolveTableSeats(4, [g("a", 0, 0), g("b", 0, 2), g("c", 1)]);
    expect(overflow).toEqual([]);
    expect(seats.filter((s) => s?.guestId === "c")).toHaveLength(2);
  });
});

describe("findFreeBlock", () => {
  it("prefiere un bloque que incluya la silla elegida", () => {
    const seats = Array.from({ length: 8 }, () => null);
    expect(findFreeBlock(seats, 2, 5)).toBe(5);
    expect(findFreeBlock(seats, 1)).toBe(0);
  });

  it("si la silla elegida está al final de un hueco, empieza antes", () => {
    const seats = Array.from({ length: 6 }, () => null) as ({ guestId: string; companion: number } | null)[];
    seats[3] = { guestId: "x", companion: 0 };
    expect(findFreeBlock(seats, 2, 2)).toBe(1);
  });

  it("devuelve null si el grupo es más grande que la mesa", () => {
    expect(findFreeBlock([null, null], 3)).toBeNull();
  });
});

describe("planSeat", () => {
  it("no asigna si la mesa no tiene lugar para todo el grupo", () => {
    const plan = planSeat(8, [g("a", 3), g("b", 2)], { plusOnes: 2 });
    expect(plan).toEqual({ ok: false, reason: "full", free: 1 });
  });

  it("usa la silla donde se soltó", () => {
    const plan = planSeat(8, [g("a", 0, 0)], { plusOnes: 1 }, 4);
    expect(plan).toEqual({ ok: true, seatIndex: 4, moved: [] });
  });

  it("reacomoda la mesa si hay lugar pero no sillas juntas", () => {
    // 6 sillas: a en 0, b en 2, c en 4 → libres 1, 3, 5 (sueltas). Llega un grupo de 2.
    const plan = planSeat(6, [g("a", 0, 0), g("b", 0, 2), g("c", 0, 4)], { plusOnes: 1 });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.moved).toEqual([
      { id: "b", seatIndex: 1 },
      { id: "c", seatIndex: 2 },
    ]);
    expect(plan.seatIndex).toBe(3);
  });
});

describe("planSeat con una silla ocupada", () => {
  it("no busca otra silla si se soltó sobre la de otro invitado", () => {
    // Mesa de 8, Ana en la silla 3: soltar a Luis en la 3 no debe sentarlo en la 0.
    const plan = planSeat(8, [g("ana", 0, 3)], { plusOnes: 0 }, 3);
    expect(plan).toEqual({ ok: false, reason: "seat-taken", seatIndex: 3 });
  });

  it("también cuenta como ocupada la silla de un acompañante o de quien no tiene silla guardada", () => {
    expect(planSeat(8, [g("ana", 1, 3)], { plusOnes: 0 }, 4)).toMatchObject({ ok: false, reason: "seat-taken" });
    // Sin seatIndex, resolveTableSeats sienta a "b" en la 0.
    expect(planSeat(8, [g("b")], { plusOnes: 0 }, 0)).toMatchObject({ ok: false, reason: "seat-taken" });
  });

  it("sin lugar en la mesa avisa que está llena aunque la silla esté ocupada", () => {
    const plan = planSeat(2, [g("a", 0, 0), g("b", 0, 1)], { plusOnes: 0 }, 0);
    expect(plan).toEqual({ ok: false, reason: "full", free: 0 });
  });
});

describe("isSameSeat", () => {
  const table = [g("ana", 1, 2), g("luis", 0, 5)];

  it("soltarlo en su propia silla (o la de su acompañante) no cambia nada", () => {
    expect(isSameSeat(8, table, "ana", 2)).toBe(true);
    expect(isSameSeat(8, table, "ana", 3)).toBe(true);
  });

  it("soltarlo sobre su misma mesa no cambia nada", () => {
    expect(isSameSeat(8, table, "luis", null)).toBe(true);
  });

  it("otra silla, la de otro, u otra mesa sí son un cambio", () => {
    expect(isSameSeat(8, table, "ana", 4)).toBe(false);
    expect(isSameSeat(8, table, "ana", 5)).toBe(false);
    expect(isSameSeat(8, table, "pedro", null)).toBe(false);
  });
});

describe("seatPlanMessage", () => {
  it("explica que la silla es de otro o que la mesa está llena", () => {
    expect(seatPlanMessage("Mesa 4", { fullName: "Luis", plusOnes: 0 }, { ok: false, reason: "seat-taken", seatIndex: 3 })).toBe(
      "La silla 4 de Mesa 4 ya está ocupada. Suelta a Luis en una silla libre o sobre la mesa."
    );
    expect(seatPlanMessage("Mesa 4", { fullName: "Luis", plusOnes: 0 }, { ok: false, reason: "full", free: 0 })).toBe(
      noRoomMessage("Mesa 4", { fullName: "Luis", plusOnes: 0 }, 0)
    );
  });
});

describe("noRoomMessage", () => {
  it("explica cuántas personas son y cuántas sillas quedan", () => {
    expect(noRoomMessage("Mesa 3", { fullName: "Ana", plusOnes: 2 }, 1)).toBe(
      "Mesa 3 no tiene lugar: Ana viene con 3 personas y solo queda 1 libre."
    );
    expect(noRoomMessage("", { fullName: "Luis", plusOnes: 0 }, 0)).toBe(
      "La mesa no tiene lugar: Luis necesita 1 silla y ya no quedan sillas libres."
    );
  });
});

describe("tableSeatLayout y findSeatAt", () => {
  const table = { id: "t1", type: "table-round", x: 500, y: 500, width: 100, height: 100, rotation: 0, capacity: 8 };

  it("encuentra la silla bajo el punto", () => {
    const { points } = tableSeatLayout(table, 100);
    const seat = points[2];
    expect(findSeatAt([table], { x: 500 + seat.x, y: 500 + seat.y }, 100)).toEqual({ tableId: "t1", seatIndex: 2 });
  });

  it("sobre la mesa (no sobre una silla) devuelve seatIndex null", () => {
    expect(findSeatAt([table], { x: 505, y: 495 }, 100)).toEqual({ tableId: "t1", seatIndex: null });
  });

  it("tiene en cuenta la rotación de la mesa", () => {
    const rect = { id: "r", type: "table-rectangular", x: 0, y: 0, width: 180, height: 75, rotation: 90, capacity: 4 };
    const { points } = tableSeatLayout(rect, 100);
    // Rotada 90°: el punto local (x, y) queda en (-y, x).
    const p = points[0];
    expect(findSeatAt([rect], { x: -p.y, y: p.x }, 100)).toEqual({ tableId: "r", seatIndex: 0 });
  });

  it("las sillas de una mesa rectangular dan la vuelta (la última queda junto a la primera)", () => {
    const rect = { type: "table-rectangular", width: 180, height: 75, capacity: 6 };
    const { points } = tableSeatLayout(rect, 100);
    expect(points[2].x).toBeGreaterThan(0);
    expect(points[3].x).toBeGreaterThan(0); // abajo a la derecha, debajo de la silla 2
    expect(points[5].x).toBeLessThan(0); // abajo a la izquierda, debajo de la silla 0
  });

  it("seatWorldPosition y findSeatAt coinciden con la mesa rotada", () => {
    const rotated = { ...table, rotation: 37 };
    const pos = seatWorldPosition(rotated, 5, 100)!;
    expect(findSeatAt([rotated], pos, 100)).toEqual({ tableId: "t1", seatIndex: 5 });
    expect(seatWorldPosition(rotated, 99, 100)).toBeNull();
  });

  it("ignora lo que no es mesa", () => {
    expect(findSeatAt([{ ...table, type: "dance-floor" }], { x: 500, y: 500 }, 100)).toBeNull();
  });
});

describe("matchesGuestSearch", () => {
  const guest = { fullName: "María José López García", plusOneNames: ["Andrés Núñez"], group: "Familia de la novia" };

  it("ignora tildes y mayúsculas", () => {
    expect(matchesGuestSearch(guest, "maria")).toBe(true);
    expect(matchesGuestSearch(guest, "GARCÍA")).toBe(true);
    expect(matchesGuestSearch(guest, "nunez")).toBe(true);
  });

  it("funciona con dos apellidos y en cualquier orden", () => {
    expect(matchesGuestSearch(guest, "lopez garcia")).toBe(true);
    expect(matchesGuestSearch(guest, "garcia maria")).toBe(true);
    expect(matchesGuestSearch(guest, "lopez perez")).toBe(false);
  });

  it("busca también por grupo y acepta búsqueda vacía", () => {
    expect(matchesGuestSearch(guest, "familia")).toBe(true);
    expect(matchesGuestSearch(guest, "  ")).toBe(true);
  });
});

describe("guestInitials", () => {
  it("toma nombre y primer apellido", () => {
    expect(guestInitials("Carlos Zelaya")).toBe("CZ");
    expect(guestInitials("María López García")).toBe("ML");
    expect(guestInitials("María José López García")).toBe("ML");
    expect(guestInitials("ana")).toBe("A");
    expect(guestInitials("  ")).toBe("?");
  });
});

describe("seatColorSlot", () => {
  it("por lado: novia, novio y ambos tienen color; sin lado es neutro", () => {
    expect(seatColorSlot({ side: "bride", group: "" }, "side", [])).toBe(0);
    expect(seatColorSlot({ side: "groom", group: "" }, "side", [])).toBe(3);
    expect(seatColorSlot({ side: "", group: "" }, "side", [])).toBeNull();
  });

  it("por grupo: según el orden alfabético de los grupos", () => {
    const groups = sortedGroups([{ group: "Trabajo" }, { group: "Amigos" }, { group: "" }, { group: "Amigos" }]);
    expect(groups).toEqual(["Amigos", "Trabajo"]);
    expect(seatColorSlot({ side: "", group: "Trabajo" }, "group", groups)).toBe(1);
    expect(seatColorSlot({ side: "bride", group: "" }, "group", groups)).toBeNull();
  });
});
