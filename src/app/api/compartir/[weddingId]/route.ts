import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFileToDrive } from "@/lib/googleDrive";
import { GUEST_LABEL_PREFIX, GUEST_MAX_BYTES, guestUploadState } from "@/app/compartir/[weddingId]/constants";
import { isWeddingEditor } from "@/app/compartir/[weddingId]/access";

/** Límite simple por IP (en memoria): frena abusos del enlace público sin estorbar a un invitado. */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 150;
const hits = new Map<string, { count: number; start: number }>();

function rateLimited(ip: string) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) {
    hits.set(ip, { count: 1, start: now });
    if (hits.size > 5000) for (const [key, value] of hits) if (now - value.start > WINDOW_MS) hits.delete(key);
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/**
 * Subida pública de fotos y videos de los invitados (página /compartir/<id>, a la que lleva el QR
 * de las mesas). Cada archivo va a la carpeta de Google Drive de la boda y queda en Fotos con la
 * etiqueta "Invitado · <nombre>", en la carpeta "Fotos de la boda". Solo dentro de la ventana de la boda
 * (un día antes hasta 30 después); los editores de la boda pueden subir siempre.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/compartir/[weddingId]">) {
  const { weddingId } = await ctx.params;
  if (!ObjectId.isValid(weddingId)) return fail("Boda no encontrada", 404);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anon";
  if (rateLimited(ip)) return fail("Subiste muchos archivos seguidos. Intenta de nuevo en un rato.", 429);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("No llegó ningún archivo.", 400);
  if (file.size > GUEST_MAX_BYTES) return fail("El archivo es muy pesado (máximo 24 MB).", 413);
  const isVideo = file.type.startsWith("video/");
  if (!isVideo && !file.type.startsWith("image/")) return fail("Solo se pueden subir fotos o videos.", 415);

  const guestName = String(form?.get("name") ?? "")
    .replace(/[\u0000-\u001f<>]/g, "")
    .trim()
    .slice(0, 60);

  const wedding = await prisma.wedding.findUnique({ where: { id: weddingId }, select: { id: true, weddingDate: true } });
  if (!wedding) return fail("Boda no encontrada", 404);
  const state = guestUploadState(wedding.weddingDate);
  if (state !== "open" && !(await isWeddingEditor(weddingId))) {
    return fail(state === "soon" ? "El álbum todavía no está abierto." : "El álbum ya cerró. ¡Gracias!", 403);
  }

  const safeName = (guestName || "Invitado").replace(/[\\/:*?"|]/g, "");
  const named = new File([file], `${safeName} - ${file.name || (isVideo ? "video" : "foto")}`.slice(0, 180), {
    type: file.type,
  });

  let uploaded: Awaited<ReturnType<typeof uploadFileToDrive>> = null;
  try {
    uploaded = await uploadFileToDrive(named, weddingId, "boda");
  } catch (error) {
    console.error("[compartir] no se pudo subir a Drive", error);
  }
  if (!uploaded) return fail("No pudimos guardar el archivo. Intenta de nuevo en un momento.", 503);

  const count = await prisma.mediaItem.count({ where: { weddingId } });
  await prisma.mediaItem.create({
    data: {
      weddingId,
      type: isVideo ? "video" : "image",
      url: uploaded.url,
      driveFileId: uploaded.driveFileId,
      folder: "boda",
      label: `${GUEST_LABEL_PREFIX}${guestName || "Anónimo"}`,
      notes: "Subido desde la página para invitados",
      sortOrder: count,
    },
  });

  return NextResponse.json({ driveFileId: uploaded.driveFileId, type: isVideo ? "video" : "image" });
}
