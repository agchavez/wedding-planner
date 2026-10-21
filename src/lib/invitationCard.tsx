import "server-only";
import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { invitationTheme, monogram } from "@/lib/invitationThemes";

/**
 * Tarjeta que WhatsApp (y Telegram, iMessage, Facebook…) muestra al pegar el enlace de una
 * invitación. Con foto de portada: texto a la izquierda y la foto de la pareja a la derecha.
 * Se entrega en JPEG para quedar muy por debajo del límite de WhatsApp (~300-600 KB): un
 * PNG con foto lo pasaría y WhatsApp mostraría la vista previa pequeña o ninguna.
 */

export const CARD_SIZE = { width: 1200, height: 630 };
export const CARD_CONTENT_TYPE = "image/jpeg";

const publicDir = join(process.cwd(), "public");
const fontsDir = join(publicDir, "fonts");
const fontsPromise = Promise.all([
  readFile(join(fontsDir, "great-vibes-latin-400-normal.ttf")),
  readFile(join(fontsDir, "cormorant-garamond-latin-500-normal.ttf")),
  readFile(join(fontsDir, "cormorant-garamond-latin-600-normal.ttf")),
  readFile(join(fontsDir, "cormorant-garamond-latin-600-italic.ttf")),
]);

const PHOTO_WIDTH = 520;

/**
 * La URL de portada la escribe la pareja y el servidor la descarga: solo https hacia nombres
 * de dominio públicos (sin IPs literales ni nombres internos), sin seguir redirecciones.
 */
function isFetchableUrl(raw: string) {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password) return false;
    if (/^[\d.]+$/.test(host) || host.includes(":") || !host.includes(".")) return false;
    return !/(^|\.)(localhost|local|internal|lan|home|corp)$/.test(host);
  } catch {
    return false;
  }
}

/** Foto de portada lista para la tarjeta (recortada y en JPEG). Null si no se puede cargar. */
async function loadPhoto(url: string): Promise<string | null> {
  try {
    let source: Buffer;
    if (url.startsWith("/") && !url.startsWith("//")) {
      // Ruta local (fotos de ejemplo): solo dentro de public/.
      const path = normalize(join(publicDir, url));
      if (!path.startsWith(publicDir)) return null;
      source = await readFile(path);
    } else if (isFetchableUrl(url)) {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000), redirect: "error" });
      if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) return null;
      source = Buffer.from(await res.arrayBuffer());
      if (source.length > 15 * 1024 * 1024) return null;
    } else {
      return null;
    }
    const jpeg = await sharp(source)
      .rotate()
      .resize(PHOTO_WIDTH * 2, CARD_SIZE.height * 2, { fit: "cover", position: "centre" })
      .jpeg({ quality: 80 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

export type InvitationCardInput = {
  theme: string;
  partner1: string;
  partner2: string;
  /** Nombre del invitado; null para una tarjeta genérica. */
  guestName: string | null;
  dayLabel: string;
  place: string;
  coverImageUrl: string;
};

export async function renderInvitationCard(input: InvitationCardInput): Promise<Response> {
  const [[script, serif500, serif600, serifItalic], photo] = await Promise.all([
    fontsPromise,
    input.coverImageUrl ? loadPhoto(input.coverImageUrl) : Promise.resolve(null),
  ]);
  const t = invitationTheme(input.theme);
  const names = [input.partner1, input.partner2].filter(Boolean);
  const couple = names.join(" & ") || "Nuestra boda";
  const coupleSize = photo ? (couple.length > 16 ? 82 : 100) : couple.length > 18 ? 100 : 128;

  const text = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        width: photo ? CARD_SIZE.width - PHOTO_WIDTH - 60 : undefined,
        paddingLeft: 20,
        paddingRight: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 84,
          height: 84,
          borderRadius: 999,
          border: `1.5px solid ${t.gold}`,
          color: t.accent,
          fontFamily: "Serif",
          fontSize: 22,
          letterSpacing: 2,
          whiteSpace: "nowrap",
        }}
      >
        {monogram(input.partner1, input.partner2)}
      </div>
      <div
        style={{
          marginTop: 20,
          fontFamily: "Serif",
          fontSize: 21,
          letterSpacing: 8,
          color: t.muted,
          textTransform: "uppercase",
        }}
      >
        {input.guestName ? "Invitación para" : "Te invitamos a nuestra boda"}
      </div>
      {input.guestName && (
        <div style={{ marginTop: 6, fontFamily: "Serif", fontWeight: 600, fontSize: 42, color: t.ink }}>
          {input.guestName}
        </div>
      )}
      <div style={{ marginTop: 4, fontFamily: "Script", fontSize: coupleSize, lineHeight: 1.15, color: t.accent }}>
        {couple}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 6 }}>
        <div style={{ width: 100, height: 1, background: t.gold }} />
        <div style={{ width: 10, height: 10, transform: "rotate(45deg)", border: `1.5px solid ${t.gold}` }} />
        <div style={{ width: 100, height: 1, background: t.gold }} />
      </div>
      {input.dayLabel && (
        <div
          style={{
            marginTop: 18,
            fontFamily: "Serif",
            fontWeight: 600,
            fontSize: photo ? 22 : 26,
            letterSpacing: photo ? 4 : 6,
            color: t.ink,
            textTransform: "uppercase",
          }}
        >
          {input.dayLabel}
        </div>
      )}
      {input.place && (
        <div style={{ marginTop: 6, fontFamily: "Serif", fontStyle: "italic", fontSize: 26, color: t.muted }}>
          {input.place}
        </div>
      )}
    </div>
  );

  const image = new ImageResponse(
    photo ? (
      <div style={{ width: "100%", height: "100%", display: "flex", background: t.paper }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div
            style={{
              position: "absolute",
              top: 26,
              left: 26,
              right: 26,
              bottom: 26,
              border: `1px solid ${t.gold}`,
              borderRadius: 18,
              opacity: 0.6,
            }}
          />
          {text}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- satori, no es HTML */}
        <img src={photo} alt="" width={PHOTO_WIDTH} height={CARD_SIZE.height} style={{ objectFit: "cover" }} />
      </div>
    ) : (
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
          {text}
        </div>
      </div>
    ),
    {
      ...CARD_SIZE,
      fonts: [
        { name: "Script", data: script, weight: 400, style: "normal" },
        { name: "Serif", data: serif500, weight: 500, style: "normal" },
        { name: "Serif", data: serif600, weight: 600, style: "normal" },
        { name: "Serif", data: serifItalic, weight: 600, style: "italic" },
      ],
    }
  );

  const jpeg = await sharp(Buffer.from(await image.arrayBuffer())).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": CARD_CONTENT_TYPE,
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
