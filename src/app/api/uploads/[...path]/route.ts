import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { mongoDb } from "@/lib/mongo";
import { prisma } from "@/lib/prisma";
import { idMatch } from "@/lib/ids";
import { getSession } from "@/lib/session";
import { UPLOADS_ROOT } from "@/lib/uploads";

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
};

type Reader = { id: string; isAdmin: boolean };

async function isMember(reader: Reader, weddingId: string) {
  if (reader.isAdmin) return true;
  return !!(await mongoDb.collection("member").findOne({ userId: idMatch(reader.id), organizationId: idMatch(weddingId) }));
}

/**
 * ¿Puede ver este archivo? Comprobantes: participantes de la boda del pago. Planos
 * (floorplans/<boda>/…): la boda que lo subió, quien tiene el plano copiado en un layout de su
 * boda (biblioteca) y quien ve el salón de la biblioteca que lo usa (de plataforma, propio o de
 * su boda). Conocer la URL no basta para darse acceso: al guardar, un layout o una versión solo
 * aceptan planos de su propia boda o de un salón de la biblioteca visible (canUsePlanUrl).
 */
async function canReadUpload(url: string, segments: string[], reader: Reader): Promise<boolean> {
  if (segments[0] === "floorplans") {
    const ownerWeddingId = segments[1] ?? "";
    if (/^[a-f0-9]{24}$/i.test(ownerWeddingId) && (await isMember(reader, ownerWeddingId))) return true;
    const layouts = await prisma.seatingLayout.findMany({
      where: { backgroundImage: { is: { url } } },
      select: { weddingId: true },
      take: 50,
    });
    for (const l of layouts) if (l.weddingId && (await isMember(reader, l.weddingId))) return true;
    const versions = await prisma.venueRoomVersion.findMany({
      where: { backgroundImage: { is: { url } } },
      select: { roomId: true },
      take: 50,
    });
    if (versions.length === 0) return false;
    const rooms = await prisma.venueRoom.findMany({ where: { id: { in: versions.map((v) => v.roomId) } }, select: { venueId: true } });
    const venues = await prisma.venue.findMany({ where: { id: { in: rooms.map((r) => r.venueId) } } });
    for (const venue of venues) {
      if (venue.visibility === "platform" || venue.createdById === reader.id) return true;
      if (venue.weddingId && (await isMember(reader, venue.weddingId))) return true;
    }
    return false;
  }

  const payment = await prisma.expensePayment.findFirst({ where: { receiptUrl: url }, select: { expenseId: true } });
  const expense = payment && (await prisma.expense.findUnique({ where: { id: payment.expenseId }, select: { weddingId: true } }));
  return !!expense?.weddingId && (await isMember(reader, expense.weddingId));
}

/**
 * Sirve un archivo subido (comprobante de pago o plano de un salón) solo a quien participa en
 * la boda dueña (o a un administrador). Ver canReadUpload.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/uploads/[...path]">) {
  const session = await getSession();
  if (!session) return new NextResponse("No autorizado", { status: 401 });

  const segments = (await ctx.params).path;
  const url = `/api/uploads/${segments.join("/")}`;
  const filePath = path.resolve(/*turbopackIgnore: true*/ UPLOADS_ROOT, ...segments);
  if (!filePath.startsWith(path.resolve(UPLOADS_ROOT) + path.sep)) return new NextResponse("No encontrado", { status: 404 });

  // El administrador ve todo, pero el archivo debe seguir siendo de un pago o de un plano.
  if (!(await canReadUpload(url, segments, { id: session.user.id, isAdmin: session.user.role === "admin" }))) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  try {
    const data = await readFile(filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("No encontrado", { status: 404 });
  }
}
