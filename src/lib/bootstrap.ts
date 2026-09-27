import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { mongoDb } from "@/lib/mongo";
import { prisma } from "@/lib/prisma";

/** Id fijo que usaba la v1 (una sola boda, sin usuarios). */
const LEGACY_WEDDING_ID = "000000000000000000000001";

/**
 * Crea el primer administrador a partir de ADMIN_EMAIL / ADMIN_PASSWORD si todavía no
 * existe ningún admin. Si hay una boda de la v1 sin dueño, se la asigna. Es idempotente:
 * con un admin ya creado no hace nada, así que las variables pueden quedarse puestas.
 */
export async function bootstrapAdmin() {
  await ensureAuthIndexes();

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const users = mongoDb.collection("user");
  if (await users.findOne({ role: "admin" })) return;

  const existing = await users.findOne({ email });
  let userId: string;
  if (existing) {
    await users.updateOne({ _id: existing._id }, { $set: { role: "admin" } });
    userId = existing._id.toHexString();
  } else {
    const { user } = await auth.api.createUser({
      body: { email, password, name: process.env.ADMIN_NAME || "Administrador", role: "admin" },
    });
    userId = user.id;
  }

  const legacy = await prisma.wedding.findUnique({ where: { id: LEGACY_WEDDING_ID } });
  if (legacy && !(await users.findOne({ weddingId: LEGACY_WEDDING_ID }))) {
    await users.updateOne({ _id: new ObjectId(userId) }, { $set: { weddingId: LEGACY_WEDDING_ID } });
  }

  console.log(`[bootstrap] Administrador inicial listo: ${email}`);
}

/** Better Auth no crea índices en MongoDB; estos cubren unicidad y las búsquedas frecuentes. */
async function ensureAuthIndexes() {
  await Promise.all([
    mongoDb.collection("user").createIndex({ email: 1 }, { unique: true }),
    mongoDb.collection("user").createIndex({ weddingId: 1 }),
    mongoDb.collection("session").createIndex({ token: 1 }, { unique: true }),
    mongoDb.collection("session").createIndex({ userId: 1 }),
    mongoDb.collection("session").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    mongoDb.collection("account").createIndex({ userId: 1 }),
    mongoDb.collection("verification").createIndex({ identifier: 1 }),
  ]);
}
