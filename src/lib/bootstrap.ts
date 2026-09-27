import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { mongoDb } from "@/lib/mongo";
import { prisma } from "@/lib/prisma";

/**
 * Crea el primer administrador a partir de ADMIN_EMAIL / ADMIN_PASSWORD si todavía no
 * existe ningún admin. Es idempotente: con un admin ya creado no hace nada, así que las
 * variables pueden quedarse puestas.
 */
export async function bootstrapAdmin() {
  await ensureAuthIndexes();
  await migrateLegacyWeddings();

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const users = mongoDb.collection("user");
  if (await users.findOne({ role: "admin" })) return;

  const existing = await users.findOne({ email });
  if (existing) {
    await users.updateOne({ _id: existing._id }, { $set: { role: "admin" } });
  } else {
    await auth.api.createUser({
      body: { email, password, name: process.env.ADMIN_NAME || "Administrador", role: "admin" },
    });
  }

  console.log(`[bootstrap] Administrador inicial listo: ${email}`);
}

const AUDIT_RETENTION_DAYS = 180;

/**
 * Better Auth (y Prisma sin `db push`) no crean índices en MongoDB; estos cubren
 * unicidad y las búsquedas frecuentes. El TTL de AuditLog borra eventos viejos.
 */
async function ensureAuthIndexes() {
  const auditLog = mongoDb.collection("AuditLog");
  await Promise.all([
    auditLog.createIndex({ createdAt: 1 }, { expireAfterSeconds: AUDIT_RETENTION_DAYS * 86400 }),
    auditLog.createIndex({ category: 1, createdAt: -1 }),
    auditLog.createIndex({ weddingId: 1, createdAt: -1 }),
    auditLog.createIndex({ actorId: 1, createdAt: -1 }),
    auditLog.createIndex({ action: 1, createdAt: -1 }),
    mongoDb.collection("member").createIndex({ userId: 1 }),
    mongoDb.collection("member").createIndex({ organizationId: 1 }),
    mongoDb.collection("invitation").createIndex({ email: 1, status: 1 }),
    mongoDb.collection("invitation").createIndex({ organizationId: 1 }),
    mongoDb.collection("organization").createIndex({ slug: 1 }, { unique: true }),
    mongoDb.collection("user").createIndex({ email: 1 }, { unique: true }),
    mongoDb.collection("session").createIndex({ token: 1 }, { unique: true }),
    mongoDb.collection("session").createIndex({ userId: 1 }),
    mongoDb.collection("session").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    mongoDb.collection("account").createIndex({ userId: 1 }),
    mongoDb.collection("verification").createIndex({ identifier: 1 }),
  ]);
}

/**
 * Modelo anterior: cada usuario tenía `weddingId` en su documento. Ahora cada boda es
 * una organización con miembros; el usuario queda como "Pareja" (owner) de su boda.
 */
async function migrateLegacyWeddings() {
  const users = mongoDb.collection("user");
  const legacy = await users.find({ weddingId: { $type: "string" } }).toArray();
  for (const user of legacy) {
    const weddingId: string = user.weddingId;
    if (!ObjectId.isValid(weddingId)) continue;
    const orgId = new ObjectId(weddingId);
    const wedding = await prisma.wedding.findUnique({ where: { id: weddingId } });
    if (wedding) {
      await mongoDb.collection("organization").updateOne(
        { _id: orgId },
        {
          $setOnInsert: {
            name: [wedding.partner1, wedding.partner2].filter(Boolean).join(" & ") || `Boda de ${user.name}`,
            slug: `boda-${weddingId}`,
            createdAt: wedding.createdAt,
          },
        },
        { upsert: true }
      );
      await mongoDb
        .collection("member")
        .updateOne(
          { organizationId: orgId, userId: user._id },
          { $setOnInsert: { role: "owner", createdAt: new Date() } },
          { upsert: true }
        );
    }
    await users.updateOne({ _id: user._id }, { $unset: { weddingId: "" } });
    console.log(`[bootstrap] Boda ${weddingId} migrada a organización para ${user.email}`);
  }
}
