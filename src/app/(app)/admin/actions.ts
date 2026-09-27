"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { ObjectId } from "mongodb";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { mongoDb } from "@/lib/mongo";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export type ActionResult = { error?: string };

const ROLES = ["user", "admin"] as const;
type Role = (typeof ROLES)[number];

function parseRole(value: FormDataEntryValue | null): Role {
  return ROLES.includes(value as Role) ? (value as Role) : "user";
}

/** Ejecuta una acción de admin y convierte los errores en un mensaje para la UI. */
async function run(fn: (adminId: string) => Promise<void>): Promise<ActionResult> {
  const session = await requireAdmin();
  try {
    await fn(session.user.id);
  } catch (err) {
    if (err instanceof APIError) return { error: err.body?.message ?? err.message };
    if (err instanceof Error) return { error: err.message };
    return { error: "Ocurrió un error inesperado." };
  }
  revalidatePath("/admin");
  return {};
}

function notSelf(adminId: string, userId: string, what: string) {
  if (adminId === userId) throw new Error(`No puedes ${what} tu propia cuenta.`);
}

/**
 * `weddingChoice`: id de una boda existente, "new" para crear una boda vacía ahora, u
 * "on-login" para que se cree automáticamente la primera vez que el usuario entre.
 */
async function resolveWeddingId(weddingChoice: string): Promise<string | null> {
  if (!weddingChoice || weddingChoice === "on-login") return null;
  if (weddingChoice === "new") return (await prisma.wedding.create({ data: {} })).id;
  if (!ObjectId.isValid(weddingChoice) || !(await prisma.wedding.count({ where: { id: weddingChoice } }))) {
    throw new Error("La boda seleccionada no existe.");
  }
  return weddingChoice;
}

async function setUserWedding(userId: string, weddingId: string | null) {
  await mongoDb.collection("user").updateOne({ _id: new ObjectId(userId) }, { $set: { weddingId } });
}

export async function createUserAction(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const password = String(formData.get("password") ?? "");
    if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");

    const { user } = await auth.api.createUser({
      headers: await headers(),
      body: {
        name: String(formData.get("name") ?? "").trim(),
        email: String(formData.get("email") ?? "").trim().toLowerCase(),
        password,
        role: parseRole(formData.get("role")),
      },
    });
    await setUserWedding(user.id, await resolveWeddingId(String(formData.get("weddingId") ?? "")));
  });
}

export async function setRoleAction(userId: string, role: string): Promise<ActionResult> {
  return run(async (adminId) => {
    notSelf(adminId, userId, "cambiar el rol de");
    await auth.api.setRole({ headers: await headers(), body: { userId, role: parseRole(role) } });
  });
}

export async function setPasswordAction(userId: string, formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const newPassword = String(formData.get("password") ?? "");
    if (newPassword.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
    const h = await headers();
    await auth.api.setUserPassword({ headers: h, body: { userId, newPassword } });
    // Cierra las sesiones abiertas con la contraseña anterior.
    await auth.api.revokeUserSessions({ headers: h, body: { userId } });
  });
}

export async function assignWeddingAction(userId: string, weddingChoice: string): Promise<ActionResult> {
  return run(async () => {
    await setUserWedding(userId, await resolveWeddingId(weddingChoice));
  });
}

export async function setBannedAction(userId: string, banned: boolean): Promise<ActionResult> {
  return run(async (adminId) => {
    notSelf(adminId, userId, "suspender");
    const h = await headers();
    if (banned) {
      await auth.api.banUser({ headers: h, body: { userId, banReason: "Suspendido por un administrador" } });
    } else {
      await auth.api.unbanUser({ headers: h, body: { userId } });
    }
  });
}

export async function removeUserAction(userId: string): Promise<ActionResult> {
  return run(async (adminId) => {
    notSelf(adminId, userId, "eliminar");
    await auth.api.removeUser({ headers: await headers(), body: { userId } });
  });
}
