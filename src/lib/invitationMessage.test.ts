import { describe, expect, it } from "vitest";
import {
  invitationStatus,
  isValidWhatsappPhone,
  normalizePhone,
  renderInvitationMessage,
  whatsappUrl,
} from "@/lib/invitationMessage";
import { parseEventDateTime, toEventDateTimeValue } from "@/lib/eventTime";

describe("normalizePhone", () => {
  it("antepone el código de país a números locales", () => {
    expect(normalizePhone("9988-7766")).toBe("50499887766");
    expect(normalizePhone(" 9988 7766 ")).toBe("50499887766");
  });
  it("respeta números con + o 00", () => {
    expect(normalizePhone("+1 (305) 555-1234")).toBe("13055551234");
    expect(normalizePhone("0034 612 345 678")).toBe("34612345678");
  });
  it("no duplica el código si ya viene", () => {
    expect(normalizePhone("50499887766")).toBe("50499887766");
  });
  it("usa el código de país configurado", () => {
    expect(normalizePhone("5512345678", "52")).toBe("525512345678");
  });
  it("vacío sigue vacío", () => {
    expect(normalizePhone("")).toBe("");
    expect(isValidWhatsappPhone("")).toBe(false);
  });
});

describe("renderInvitationMessage", () => {
  const ctx = { fullName: "María Fernanda López", coupleNames: "Ana & Luis", dateLabel: "14 de febrero de 2027", link: "https://x.hn/i/abc", seats: 2 };

  it("reemplaza las variables", () => {
    expect(renderInvitationMessage("{nombre}|{nombre_completo}|{pareja}|{fecha}|{enlace}|{lugares}", ctx)).toBe(
      "María|María Fernanda López|Ana & Luis|14 de febrero de 2027|https://x.hn/i/abc|2"
    );
  });
  it("agrega el enlace al final si la plantilla no lo incluye", () => {
    expect(renderInvitationMessage("Hola {nombre}", ctx)).toBe("Hola María\n\nhttps://x.hn/i/abc");
  });
  it("usa la plantilla predeterminada si está vacía", () => {
    expect(renderInvitationMessage("  ", ctx)).toContain("https://x.hn/i/abc");
  });
});

describe("whatsappUrl", () => {
  it("con y sin teléfono", () => {
    expect(whatsappUrl("50499887766", "Hola & adiós")).toBe("https://wa.me/50499887766?text=Hola%20%26%20adi%C3%B3s");
    expect(whatsappUrl("", "Hola")).toBe("https://wa.me/?text=Hola");
  });
});

describe("invitationStatus", () => {
  it("prioriza la respuesta sobre la apertura y el envío", () => {
    expect(invitationStatus({ rsvpStatus: "pending" })).toBe("not_sent");
    expect(invitationStatus({ rsvpStatus: "pending", invitationSentAt: "2026-01-01" })).toBe("sent");
    expect(invitationStatus({ rsvpStatus: "pending", invitationSentAt: "x", invitationOpenedAt: "y" })).toBe("opened");
    expect(invitationStatus({ rsvpStatus: "confirmed", invitationOpenedAt: "y" })).toBe("confirmed");
    expect(invitationStatus({ rsvpStatus: "declined" })).toBe("declined");
  });
});

describe("hora del evento", () => {
  it("interpreta y muestra en hora de Honduras", () => {
    const d = parseEventDateTime("2027-02-14T16:00");
    expect(d?.toISOString()).toBe("2027-02-14T22:00:00.000Z");
    expect(toEventDateTimeValue(d)).toBe("2027-02-14T16:00");
    expect(parseEventDateTime("mañana")).toBeNull();
  });
});
