import { MongoClient } from "mongodb";

declare global {
  var __mongoClient: MongoClient | undefined;
}

// Durante `next build` los módulos se evalúan sin variables de entorno; el cliente
// conecta de forma perezosa, así que basta con un URI de relleno en esa fase.
export const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const uri = process.env.MONGODB_URI ?? (isBuildPhase ? "mongodb://build-placeholder/weddingplanner" : undefined);
if (!uri) throw new Error("MONGODB_URI no está definido");

/**
 * Cliente nativo de MongoDB compartido. Better Auth lo usa para sus colecciones
 * (user, session, account, verification); el resto de la app sigue usando Prisma.
 * Ambos apuntan a la misma base de datos (la del path de MONGODB_URI).
 */
export const mongoClient = global.__mongoClient ?? new MongoClient(uri);

if (process.env.NODE_ENV !== "production") {
  global.__mongoClient = mongoClient;
}

export const mongoDb = mongoClient.db();
