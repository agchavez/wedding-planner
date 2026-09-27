import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Sesión del request actual (deduplicada por request con React `cache`). */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** Exige una sesión válida; si no hay, redirige al login. */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "admin") redirect("/");
  return session;
}
