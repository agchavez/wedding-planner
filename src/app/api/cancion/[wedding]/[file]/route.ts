import { readFile } from "node:fs/promises";
import path from "node:path";
import { SONG_CONTENT_TYPES, songFileKind } from "@/lib/songFiles";
import { UPLOADS_ROOT } from "@/lib/uploads";

const notFound = () => new Response("No encontrado", { status: 404 });

/**
 * Canción de la invitación (uploads/songs/<boda>/<archivo>). Es pública: la escuchan los
 * invitados, que no tienen sesión. Solo sirve audio de esa carpeta y responde a pedidos por
 * rangos (Range), que Safari en iPhone exige para reproducir un <audio>.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/cancion/[wedding]/[file]">) {
  const { wedding, file } = await ctx.params;
  const kind = songFileKind(file);
  if (!/^[a-f0-9]{24}$/i.test(wedding) || !kind) return notFound();

  const root = path.resolve(/*turbopackIgnore: true*/ UPLOADS_ROOT, "songs");
  const filePath = path.resolve(root, wedding.toLowerCase(), file);
  if (!filePath.startsWith(root + path.sep)) return notFound();

  let data: Buffer;
  try {
    data = await readFile(filePath);
  } catch {
    return notFound();
  }

  const size = data.length;
  const headers = {
    "Content-Type": SONG_CONTENT_TYPES[kind],
    "Content-Disposition": "inline",
    "Accept-Ranges": "bytes",
    // El nombre lleva un identificador único: el archivo de una URL nunca cambia.
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    // "bytes=100-" (desde), "bytes=100-199" (tramo) o "bytes=-500" (los últimos 500).
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    return new Response(new Uint8Array(data.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }

  return new Response(new Uint8Array(data), { headers: { ...headers, "Content-Length": String(size) } });
}
