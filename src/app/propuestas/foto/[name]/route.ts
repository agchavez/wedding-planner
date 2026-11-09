import { access } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Boda de Angel e Indira: dueña de las fotos de las propuestas. */
const WEDDING_ID = "6ab8b4cfac4dc16342704a50";

/**
 * Foto de una propuesta de invitación. Las fotos de la sesión no están en el repositorio (es
 * público): en producción se suben a la carpeta de Google Drive de la boda (Fotos) con la
 * etiqueta "propuesta:<nombre>" y aquí se redirige al archivo compartido. En desarrollo se usa la
 * copia local de public/propuestas (ignorada por git) si existe.
 */
export async function GET(request: Request, ctx: RouteContext<"/propuestas/foto/[name]">) {
  const { name } = await ctx.params;
  if (!/^[a-z0-9-]{1,40}$/.test(name)) return new NextResponse("No encontrado", { status: 404 });

  const local = `/propuestas/${name}.webp`;
  const hasLocal = await access(path.join(/*turbopackIgnore: true*/ process.cwd(), "public", local))
    .then(() => true)
    .catch(() => false);
  if (hasLocal) return NextResponse.redirect(new URL(local, request.url), 302);

  try {
    const item = await prisma.mediaItem.findFirst({
      where: { weddingId: WEDDING_ID, label: `propuesta:${name}`, driveFileId: { not: null } },
      select: { driveFileId: true },
    });
    if (item?.driveFileId) {
      return NextResponse.redirect(`https://lh3.googleusercontent.com/d/${item.driveFileId}=w2000`, {
        status: 302,
        headers: { "Cache-Control": "public, max-age=3600" },
      });
    }
  } catch (error) {
    console.error("[propuestas] no se pudo buscar la foto", name, error);
  }
  return new NextResponse("No encontrado", { status: 404 });
}
