import { prisma } from "@/lib/prisma";

/**
 * v1: una sola boda, identificada por un id fijo. Se usa `upsert` (atómico) en vez de
 * "buscar y si no existe crear" para evitar condiciones de carrera cuando varias
 * consultas concurrentes (Promise.all en distintas páginas) intentan inicializar el
 * singleton al mismo tiempo. Si más adelante se agrega autenticación multi-boda, esta
 * función pasa a leer el id desde la sesión del usuario en vez de este id fijo.
 */
const SINGLETON_WEDDING_ID = "000000000000000000000001";

export async function getActiveWeddingId(): Promise<string> {
  const wedding = await prisma.wedding.upsert({
    where: { id: SINGLETON_WEDDING_ID },
    update: {},
    create: { id: SINGLETON_WEDDING_ID },
  });
  return wedding.id;
}

export async function getActiveWedding() {
  return prisma.wedding.upsert({
    where: { id: SINGLETON_WEDDING_ID },
    update: {},
    create: { id: SINGLETON_WEDDING_ID },
  });
}
