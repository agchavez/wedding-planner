import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "@/app/(auth)/login/LoginForm";

export const metadata: Metadata = { title: "Iniciar sesión · WeddingPlanner" };

/** Solo rutas internas: evita redirecciones abiertas a otros dominios vía ?next=. */
function safeNext(next: string | string[] | undefined) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next);
  if (await getSession()) redirect(next);

  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-b from-secondary/60 to-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-4xl">💍</span>
          <h1 className="mt-3 font-heading text-3xl font-semibold text-primary">WeddingPlanner</h1>
          <div className="mx-auto my-3 h-px w-16 bg-decorative" />
          <p className="text-sm text-muted-foreground">Inicia sesión para planificar tu boda</p>
        </div>
        <LoginForm next={next} />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          ¿No tienes cuenta? Pídele acceso al administrador.
        </p>
      </div>
    </div>
  );
}
