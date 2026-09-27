import "server-only";
import { cache } from "react";
import { ObjectId } from "mongodb";
import { prisma } from "@/lib/prisma";
import { mongoDb } from "@/lib/mongo";
import { requireSession } from "@/lib/session";

/**
 * Boda del usuario autenticado. Cada usuario tiene `weddingId` en su documento de
 * Better Auth; varios usuarios pueden compartir la misma boda (lo asigna el admin).
 * Si el usuario aún no tiene boda, se le crea una.
 *
 * Toda consulta/mutación de datos de la boda pasa por aquí, así que también es el
 * punto de control de acceso: sin sesión válida redirige al login.
 */
export const getActiveWeddingId = cache(async (): Promise<string> => {
  const session = await requireSession();
  const current = session.user.weddingId;
  if (current && (await prisma.wedding.count({ where: { id: current } }))) return current;
  return assignNewWedding(session.user.id);
});

export async function getActiveWedding() {
  const id = await getActiveWeddingId();
  return prisma.wedding.findUniqueOrThrow({ where: { id } });
}

/**
 * Reclama atómicamente un id de boda nuevo para el usuario (solo si no tiene uno
 * válido) y luego crea la boda. Si una petición concurrente ganó la carrera, se usa la
 * boda que esa petición asignó.
 */
async function assignNewWedding(userId: string): Promise<string> {
  const users = mongoDb.collection("user");
  const userObjectId = new ObjectId(userId);
  const user = await users.findOne({ _id: userObjectId }, { projection: { weddingId: 1 } });
  const previous: string | null = user?.weddingId ?? null;

  const newId = new ObjectId().toHexString();
  const claim = await users.updateOne(
    { _id: userObjectId, weddingId: previous ?? { $in: [null] } },
    { $set: { weddingId: newId } }
  );

  if (claim.modifiedCount === 0) {
    const winner = await users.findOne({ _id: userObjectId }, { projection: { weddingId: 1 } });
    if (winner?.weddingId) {
      await prisma.wedding.upsert({ where: { id: winner.weddingId }, update: {}, create: { id: winner.weddingId } });
      return winner.weddingId;
    }
  }

  await prisma.wedding.upsert({ where: { id: newId }, update: {}, create: { id: newId } });
  return newId;
}
