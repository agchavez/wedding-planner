import { ObjectId } from "mongodb";
import QRCode from "qrcode";

/** QR (SVG) que lleva a la página para que los invitados suban sus fotos. `?color=` en hex sin #. */
export async function GET(request: Request, ctx: RouteContext<"/compartir/[weddingId]/qr">) {
  const { weddingId } = await ctx.params;
  if (!ObjectId.isValid(weddingId)) return new Response("No encontrado", { status: 404 });

  const color = new URL(request.url).searchParams.get("color");
  const dark = color && /^[0-9a-f]{6}$/i.test(color) ? `#${color}` : "#343a26";
  const base = process.env.BETTER_AUTH_URL || new URL(request.url).origin;
  const svg = await QRCode.toString(new URL(`/compartir/${weddingId}`, base).toString(), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark, light: "#0000" },
  });

  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
  });
}
