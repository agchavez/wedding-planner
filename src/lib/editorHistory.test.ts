import { describe, expect, it } from "vitest";
import { COALESCE_MS, breakHistoryGroup, emptyHistory, recordHistory, redoHistory, undoHistory } from "./editorHistory";

describe("editorHistory", () => {
  it("deshace y rehace en orden", () => {
    let h = emptyHistory<number>();
    h = recordHistory(h, 1, { now: 0 });
    h = recordHistory(h, 2, { now: 10 });
    const u1 = undoHistory(h, 3)!;
    expect(u1.state).toBe(2);
    const u2 = undoHistory(u1.history, u1.state)!;
    expect(u2.state).toBe(1);
    expect(undoHistory(u2.history, u2.state)).toBeNull();
    const r1 = redoHistory(u2.history, u2.state)!;
    expect(r1.state).toBe(2);
    const r2 = redoHistory(r1.history, r1.state)!;
    expect(r2.state).toBe(3);
    expect(redoHistory(r2.history, r2.state)).toBeNull();
  });

  it("un cambio nuevo borra lo que había para rehacer", () => {
    let h = recordHistory(emptyHistory<string>(), "a", { now: 0 });
    h = undoHistory(h, "b")!.history;
    expect(h.future).toEqual(["b"]);
    h = recordHistory(h, "a", { now: 5 });
    expect(h.future).toEqual([]);
  });

  it("agrupa cambios seguidos con la misma key (un arrastre = un paso)", () => {
    let h = emptyHistory<number>();
    h = recordHistory(h, 0, { key: "drag", now: 0 });
    h = recordHistory(h, 1, { key: "drag", now: 100 });
    h = recordHistory(h, 2, { key: "drag", now: 200 });
    expect(h.past).toEqual([0]);
    // Pasado el tiempo de agrupación, o con otra key, es un paso nuevo.
    h = recordHistory(h, 3, { key: "drag", now: 200 + COALESCE_MS + 1 });
    h = recordHistory(h, 4, { key: "other", now: 200 + COALESCE_MS + 2 });
    expect(h.past).toEqual([0, 3, 4]);
    h = recordHistory(breakHistoryGroup(h), 5, { key: "other", now: 200 + COALESCE_MS + 3 });
    expect(h.past).toEqual([0, 3, 4, 5]);
  });

  it("limita el historial a los últimos pasos", () => {
    let h = emptyHistory<number>();
    for (let i = 0; i < 10; i++) h = recordHistory(h, i, { now: i, limit: 4 });
    expect(h.past).toEqual([6, 7, 8, 9]);
  });
});
