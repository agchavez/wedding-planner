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

/**
 * Sirve un comprobante de pago solo a quien participa en la boda dueña del pago
 * (o a un administrador).
 */
export async function GET(request: Request, ctx: RouteContext<"/api/uploads/[...path]">) {
  const session = await getSession();
  if (!session) return new NextResponse("No autorizado", { status: 401 });

  const segments = (await ctx.params).path;
  const url = `/api/uploads/${segments.join("/")}`;
  const filePath = path.resolve(/*turbopackIgnore: true*/ UPLOADS_ROOT, ...segments);
  if (!filePath.startsWith(path.resolve(UPLOADS_ROOT) + path.sep)) return new NextResponse("No encontrado", { status: 404 });

  const payment = await prisma.expensePayment.findFirst({ where: { receiptUrl: url }, select: { expenseId: true } });
  const expense = payment && (await prisma.expense.findUnique({ where: { id: payment.expenseId }, select: { weddingId: true } }));
  if (!expense?.weddingId) return new NextResponse("No encontrado", { status: 404 });

  if (session.user.role !== "admin") {
    const member = await mongoDb
      .collection("member")
      .findOne({ userId: idMatch(session.user.id), organizationId: idMatch(expense.weddingId) });
    if (!member) return new NextResponse("No encontrado", { status: 404 });
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
