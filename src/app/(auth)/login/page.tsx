import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "@/app/(auth)/login/LoginForm";
import { AuthShell } from "@/components/AuthShell";
import { GoogleButton, OrDivider } from "@/components/GoogleButton";
import { isGoogleEnabled } from "@/lib/auth";

export const metadata: Metadata = { title: "Iniciar sesión · Wedplan" };

/** Solo rutas internas: evita redirecciones abiertas a otros dominios vía ?next=. */
function safeNext(next: string | string[] | undefined) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getSession()) redirect(next);

  return (
    <AuthShell>
      <h1 className="font-heading text-4xl font-semibold text-foreground">Bienvenidos</h1>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">
        Entra para seguir planificando tu boda.
      </p>
      {params.error === "google" && (
        <p role="alert" className="mt-6 rounded-lg border border-destructive/25 bg-destructive/8 px-3.5 py-2.5 text-sm text-destructive">
          No se pudo entrar con Google. Si tu cuenta está suspendida, contacta al administrador; si no, inténtalo de nuevo.
        </p>
      )}
      {isGoogleEnabled && (
        <div className="mt-8">
          <GoogleButton callbackURL={next} />
          <OrDivider />
        </div>
      )}
      <LoginForm next={next} compact={isGoogleEnabled} />
      <p className="mt-8 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-primary hover:underline">
          Créala aquí
        </Link>
        . Si te invitaron a una boda, abre el enlace de tu invitación.
      </p>
    </AuthShell>
  );
}
