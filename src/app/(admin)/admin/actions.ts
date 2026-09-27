"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { idMatch, toObjectId } from "@/lib/ids";
import { mongoDb } from "@/lib/mongo";
import { requireAdmin } from "@/lib/session";

export type ActionResult = { error?: string };

const ROLES = ["user", "admin"] as const;
type Role = (typeof ROLES)[number];

function parseRole(value: FormDataEntryValue | string | null): Role {
  return ROLES.includes(value as Role) ? (value as Role) : "user";
}

/**
 * Ejecuta una acción de admin, la registra en la auditoría y convierte los errores en
 * un mensaje para la UI. `fn` devuelve el resumen que queda en el registro.
 */
async function run(action: string, targetId: string | null, fn: (adminId: string) => Promise<string>): Promise<ActionResult> {
  const session = await requireAdmin();
  try {
    const summary = await fn(session.user.id);
    await audit(action, summary, { category: "admin", targetId });
  } catch (err) {
    if (err instanceof APIError) return { error: err.body?.message ?? err.message };
    if (err instanceof Error) return { error: err.message };
    return { error: "Ocurrió un error inesperado." };
  }
  revalidatePath("/admin", "layout");
  return {};
}

function notSelf(adminId: string, userId: string, what: string) {
  if (adminId === userId) throw new Error(`No puedes ${what} tu propia cuenta.`);
}

async function userLabel(userId: string) {
  const user = await mongoDb.collection("user").findOne({ _id: toObjectId(userId) });
  return user ? `${user.name} (${user.email})` : "un usuario";
}

export async function createUserAction(formData: FormData): Promise<ActionResult> {
  return run("admin.user_create", null, async () => {
    const password = String(formData.get("password") ?? "");
    if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const role = parseRole(formData.get("role"));
    await auth.api.createUser({
      headers: await headers(),
      body: { name: String(formData.get("name") ?? "").trim(), email, password, role },
    });
    return `Creó la cuenta de ${email}${role === "admin" ? " como administrador" : ""}`;
  });
}

export async function setRoleAction(userId: string, role: string): Promise<ActionResult> {
  return run("admin.user_role", userId, async (adminId) => {
    notSelf(adminId, userId, "cambiar el rol de");
    const newRole = parseRole(role);
    await auth.api.setRole({ headers: await headers(), body: { userId, role: newRole } });
    return `${newRole === "admin" ? "Hizo administrador a" : "Quitó el rol de administrador a"} ${await userLabel(userId)}`;
  });
}

export async function setPasswordAction(userId: string, formData: FormData): Promise<ActionResult> {
  return run("admin.user_password", userId, async () => {
    const newPassword = String(formData.get("password") ?? "");
    if (newPassword.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
    const h = await headers();
    await auth.api.setUserPassword({ headers: h, body: { userId, newPassword } });
    // Cierra las sesiones abiertas con la contraseña anterior.
    await auth.api.revokeUserSessions({ headers: h, body: { userId } });
    return `Restableció la contraseña de ${await userLabel(userId)}`;
  });
}

export async function setBannedAction(userId: string, banned: boolean): Promise<ActionResult> {
  return run(banned ? "admin.user_ban" : "admin.user_unban", userId, async (adminId) => {
    notSelf(adminId, userId, "suspender");
    const h = await headers();
    if (banned) {
      await auth.api.banUser({ headers: h, body: { userId, banReason: "Suspendido por un administrador" } });
    } else {
      await auth.api.unbanUser({ headers: h, body: { userId } });
    }
    return `${banned ? "Suspendió" : "Reactivó"} la cuenta de ${await userLabel(userId)}`;
  });
}

export async function removeUserAction(userId: string): Promise<ActionResult> {
  return run("admin.user_delete", userId, async (adminId) => {
    notSelf(adminId, userId, "eliminar");
    const label = await userLabel(userId);
    await auth.api.removeUser({ headers: await headers(), body: { userId } });
    // Sus participaciones en bodas se van con la cuenta; los datos de la boda se conservan.
    await mongoDb.collection("member").deleteMany({ userId: idMatch(userId) });
    return `Eliminó la cuenta de ${label}`;
  });
}

export async function revokeUserSessionsAction(userId: string): Promise<ActionResult> {
  return run("admin.sessions_revoke", userId, async () => {
    await auth.api.revokeUserSessions({ headers: await headers(), body: { userId } });
    return `Cerró todas las sesiones de ${await userLabel(userId)}`;
  });
}

export async function revokeSessionAction(sessionToken: string, userId: string): Promise<ActionResult> {
  return run("admin.session_revoke", userId, async () => {
    await auth.api.revokeUserSession({ headers: await headers(), body: { sessionToken } });
    return `Cerró una sesión de ${await userLabel(userId)}`;
  });
}
