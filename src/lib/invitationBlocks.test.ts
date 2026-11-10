import { describe, expect, it } from "vitest";
import {
  designFromData,
  eventTimeToIso,
  findBlock,
  isoToEventTime,
  patchDesign,
  projectDesign,
  sanitizeDesign,
  splitQuote,
} from "@/lib/invitationBlocks";
import type { InvitationData } from "@/lib/guestInvitations";

const data: InvitationData = {
  partner1: "Angel",
  partner2: "Indira",
  weddingDate: "2026-12-12T00:00:00.000Z",
  venueName: "La Hacienda El Encanto de Jeto",
  venueAddress: "Comayagua",
  theme: "olive",
  headline: "¡Nos casamos!",
  message: "Nos encantaría que nos acompañes.",
  quote: "Y sobre todas estas cosas vestíos de amor, que es el vínculo perfecto. — Colosenses 3:14",
  coverImageUrl: "https://lh3.googleusercontent.com/d/abc=w2000",
  ceremonyTime: "2026-12-12T21:30:00.000Z",
  ceremonyPlace: "La Hacienda El Encanto de Jeto",
  ceremonyAddress: "Comayagua, Honduras",
  ceremonyMapUrl: "https://maps.app.goo.gl/x",
  receptionTime: null,
  receptionPlace: "",
  receptionAddress: "",
  receptionMapUrl: "",
  dressCode: "Formal",
  dressCodeNote: "No usar verde.",
  giftsNote: "Lluvia de sobres",
  hashtag: "#AyI",
  rsvpDeadline: "2026-11-28T00:00:00.000Z",
  showCountdown: true,
  brideParents: "",
  groomParents: "",
  sponsors: "",
  itinerary: [{ time: "3:30 pm", title: "Ceremonia", icon: "church" }],
  dressCodeColors: [],
  giftBankName: "",
  giftAccount: "123",
  giftAccountHolder: "Angel",
  giftRegistryUrl: "",
  galleryUrls: ["https://lh3.googleusercontent.com/d/g1=w2000", "https://lh3.googleusercontent.com/d/g2=w2000", "/propuestas/foto/x"],
  songUrl: "",
  songTitle: "",
  adultsOnly: true,
  recommendations: "Llega 20 minutos antes.",
  closingMessage: "Te esperamos",
};

describe("invitationBlocks", () => {
  it("convierte horas de Honduras", () => {
    expect(eventTimeToIso("2026-12-12T15:30")).toBe("2026-12-12T21:30:00.000Z");
    expect(isoToEventTime("2026-12-12T21:30:00.000Z")).toBe("2026-12-12T15:30");
  });

  it("separa el versículo", () => {
    expect(splitQuote("“Amor” — Colosenses 3:14")).toEqual({ text: "Amor", reference: "Colosenses 3:14" });
    expect(splitQuote("Sin referencia")).toEqual({ text: "Sin referencia", reference: "" });
  });

  it("deriva los bloques de los campos y los vuelve a proyectar sin perder nada", () => {
    const design = designFromData(data);
    expect(design.theme).toBe("editorial");
    expect(findBlock(design, "cover")?.props.photoUrl).toBe(data.coverImageUrl);
    expect(findBlock(design, "verse")?.props.reference).toBe("Colosenses 3:14");
    const p = projectDesign(design);
    expect(p.coverImageUrl).toBe(data.coverImageUrl);
    expect(p.quote).toBe(data.quote);
    expect(p.ceremonyTime).toBe(data.ceremonyTime);
    expect(p.itinerary).toEqual(data.itinerary);
    expect(p.galleryUrls).toEqual(data.galleryUrls.slice(0, 2)); // la URL de /propuestas no es válida
    expect(p.adultsOnly).toBe(true);
    expect(p.rsvpDeadline).toBe(data.rsvpDeadline);
    expect(p.showCountdown).toBe(true);
  });

  it("garantiza un único RSVP y descarta URLs inseguras", () => {
    const d = sanitizeDesign({
      theme: "gala",
      blocks: [
        { id: "a", type: "rsvp", props: {} },
        { id: "a", type: "rsvp", props: {} },
        { id: "c", type: "cover", props: { photoUrl: "javascript:alert(1)" } },
        { type: "nope" },
      ],
    })!;
    expect(d.blocks.filter((b) => b.type === "rsvp")).toHaveLength(1);
    expect(d.blocks).toHaveLength(2);
    expect(findBlock(d, "cover")?.props.photoUrl).toBe("");
    expect(d.theme).toBe("editorial");
    expect(sanitizeDesign({ v: 1 })).toBeNull();
  });

  it("aplica los cambios del MCP a los bloques", () => {
    const design = designFromData({ ...data, galleryUrls: [] });
    const next = patchDesign(design, {
      galleryUrls: ["https://example.com/a.jpg"],
      coverImageUrl: "https://example.com/c.jpg",
      ceremonyTime: "2026-12-12T16:00",
      showCountdown: false,
    });
    expect(findBlock(next, "gallery")?.hidden).toBe(false);
    expect(findBlock(next, "gallery")?.props.photos).toEqual(["https://example.com/a.jpg"]);
    expect(findBlock(next, "cover")?.props.photoUrl).toBe("https://example.com/c.jpg");
    expect(findBlock(next, "ceremony")?.props.time).toBe("2026-12-12T16:00");
    expect(findBlock(next, "countdown")?.hidden).toBe(true);
  });
});
