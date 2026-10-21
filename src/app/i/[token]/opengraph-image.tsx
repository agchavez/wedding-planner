import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { findInvitationByToken } from "@/lib/guestInvitations";
import { invitationTheme, monogram } from "@/lib/invitationThemes";
import { formatEventDay } from "@/lib/eventTime";

/**
 * Tarjeta que WhatsApp (y Telegram, iMessage, Facebook…) muestra al pegar el enlace:
 * personalizada con el nombre del invitado. Diseño plano a propósito: WhatsApp descarta
 * imágenes pesadas (~300-600 KB), y una foto en PNG pasaría ese límite.
 */

export const alt = "Invitación de boda";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

const fontsDir = join(process.cwd(), "public", "fonts");
const fontsPromise = Promise.all([
  readFile(join(fontsDir, "great-vibes-latin-400-normal.ttf")),
  readFile(join(fontsDir, "cormorant-garamond-latin-500-normal.ttf")),
  readFile(join(fontsDir, "cormorant-garamond-latin-600-normal.ttf")),
  readFile(join(fontsDir, "cormorant-garamond-latin-600-italic.ttf")),
]);

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [found, [script, serif500, serif600, serifItalic]] = await Promise.all([findInvitationByToken(token), fontsPromise]);

  const t = invitationTheme(found?.settings.theme ?? "classic");
  const wedding = found?.wedding;
  const settings = found?.settings;
  const names = [wedding?.partner1, wedding?.partner2].filter(Boolean) as string[];
  const day = settings?.ceremonyTime
    ? formatEventDay(settings.ceremonyTime)
    : wedding?.weddingDate
      ? formatEventDay(wedding.weddingDate, { utc: true })
      : "";
  const place = settings?.ceremonyPlace || wedding?.venueName || "";
  const coupleSize = names.join(" & ").length > 18 ? 100 : 128;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: t.background, padding: 34 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            position: "relative",
            background: t.paper,
            border: `2px solid ${t.gold}`,
            borderRadius: 28,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              right: 14,
              bottom: 14,
              border: `1px solid ${t.gold}`,
              borderRadius: 20,
              opacity: 0.55,
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 92,
                height: 92,
                borderRadius: 999,
                border: `1.5px solid ${t.gold}`,
                color: t.accent,
                fontFamily: "Serif",
                fontSize: 24,
                letterSpacing: 2,
                whiteSpace: "nowrap",
              }}
            >
              {monogram(wedding?.partner1 ?? "", wedding?.partner2 ?? "")}
            </div>
            <div
              style={{
                marginTop: 22,
                fontFamily: "Serif",
                fontSize: 22,
                letterSpacing: 9,
                color: t.muted,
                textTransform: "uppercase",
              }}
            >
              Invitación para
            </div>
            <div style={{ marginTop: 6, fontFamily: "Serif", fontWeight: 600, fontSize: 46, color: t.ink }}>
              {found?.guest.fullName ?? "ti"}
            </div>
            <div
              style={{
                marginTop: 4,
                fontFamily: "Script",
                fontSize: coupleSize,
                lineHeight: 1.15,
                color: t.accent,
                paddingLeft: 30,
                paddingRight: 30,
              }}
            >
              {names.join(" & ") || "Nuestra boda"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 6 }}>
              <div style={{ width: 120, height: 1, background: t.gold }} />
              <div style={{ width: 10, height: 10, transform: "rotate(45deg)", border: `1.5px solid ${t.gold}` }} />
              <div style={{ width: 120, height: 1, background: t.gold }} />
            </div>
            {day && (
              <div
                style={{
                  marginTop: 18,
                  fontFamily: "Serif",
                  fontWeight: 600,
                  fontSize: 26,
                  letterSpacing: 6,
                  color: t.ink,
                  textTransform: "uppercase",
                }}
              >
                {day}
              </div>
            )}
            {place && (
              <div style={{ marginTop: 6, fontFamily: "Serif", fontStyle: "italic", fontSize: 28, color: t.muted }}>
                {place}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Script", data: script, weight: 400, style: "normal" },
        { name: "Serif", data: serif500, weight: 500, style: "normal" },
        { name: "Serif", data: serif600, weight: 600, style: "normal" },
        { name: "Serif", data: serifItalic, weight: 600, style: "italic" },
      ],
      headers: { "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400" },
    }
  );
}
