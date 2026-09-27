import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { GoogleButton, OrDivider } from "@/components/GoogleButton";
import { isGoogleEnabled } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { SignUpForm } from "@/app/(auth)/registro/SignUpForm";

export const metadata: Metadata = { title: "Crear cuenta · Wedplan" };

export default async function RegistroPage() {
  if (await getSession()) redirect("/");

  return (
    <AuthShell tagline="Crea tu cuenta, arma tu boda y luego invita a tu pareja y a quien les ayude.">
      <h1 className="font-heading text-4xl font-semibold text-foreground">Crea tu cuenta</h1>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">
        Después te pediremos los nombres de la pareja para preparar tu boda.
      </p>
      {isGoogleEnabled && (
        <div className="mt-8">
          <GoogleButton callbackURL="/bienvenida" label="Registrarme con Google" />
          <OrDivider />
        </div>
      )}
      <SignUpForm compact={isGoogleEnabled} />
      <p className="mt-8 border-t border-border pt-5 text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </AuthShell>
  );
}
