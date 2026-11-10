import "server-only";
import { getSession } from "@/lib/session";
import { getWeddingContext } from "@/lib/wedding";

/** ¿Quien visita es editor de esta boda? (puede subir fotos aunque la ventana esté cerrada). */
export async function isWeddingEditor(weddingId: string) {
  try {
    const session = await getSession();
    if (!session) return false;
    const ctx = await getWeddingContext();
    return Boolean(ctx && ctx.weddingId === weddingId && ctx.canEdit);
  } catch {
    return false;
  }
}
