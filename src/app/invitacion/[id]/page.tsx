import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { GoogleButton, OrDivider } from "@/components/GoogleButton";
import { isGoogleEnabled } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { getInvitation } from "@/lib/invitations";
import { mongoDb } from "@/lib/mongo";
import { roleLabel } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { AcceptInvitationButton, RegisterFromInvitationForm } from "@/app/invitacion/[id]/InvitationForms";

export const metadata: Metadata = { title: "Invitación · Wedplan" };

const STATUS_MESSAGE: Record<string, string> = {
  accepted: "Esta invitación ya se usó. Inicia sesión para entrar a la boda.",
  rejected: "Esta invitación fue rechazada.",
  canceled: "Quien te invitó canceló esta invitación. Pídele una nueva si la necesitas.",
  expired: "Esta invitación venció. Pídele a quien te invitó que te envíe una nueva.",
};

export default async function InvitacionPage({ params }: PageProps<"/invitacion/[id]">) {
  const { id } = await params;
  const [invitation, session] = await Promise.all([getInvitation(id), getSession()]);

  if (!invitation || invitation.status !== "pending") {
    return (
      <AuthShell>
        <h1 className="font-heading text-3xl font-semibold text-foreground">Invitación no disponible</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          {invitation ? STATUS_MESSAGE[invitation.status] : "El enlace no corresponde a ninguna invitación."}
        </p>
        <Button className="mt-8 h-11 w-full" nativeButton={false} render={<Link href="/login" />}>
          Ir a iniciar sesión
        </Button>
      </AuthShell>
    );
  }

  const tagline = invitation.weddingName
    ? `${invitation.inviterName} te invitó a organizar la boda de ${invitation.weddingName}.`
    : `${invitation.inviterName} te invitó a organizar su boda.`;
  const heading = (
    <>
      <h1 className="font-heading text-3xl font-semibold leading-tight text-foreground">
        {invitation.weddingName || `La boda de ${invitation.inviterName}`}
      </h1>
      <p className="mt-2 leading-relaxed text-muted-foreground">
        Te invitaron como <strong className="font-medium text-foreground">{roleLabel(invitation.role).toLowerCase()}</strong>.
      </p>
    </>
  );

  if (session) {
    const sameEmail = session.user.email.toLowerCase() === invitation.email;
    return (
      <AuthShell tagline={tagline}>
        {heading}
        {sameEmail ? (
          <AcceptInvitationButton invitationId={invitation.id} />
        ) : (
          <p className="mt-6 rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            La invitación es para <strong className="text-foreground">{invitation.email}</strong>, pero entraste como{" "}
            {session.user.email}. Cierra sesión y entra con el correo invitado.
          </p>
        )}
      </AuthShell>
    );
  }

  const hasAccount = Boolean(await mongoDb.collection("user").findOne({ email: invitation.email }));

  return (
    <AuthShell tagline={tagline}>
      {heading}
      {hasAccount ? (
        <>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            Ya tienes una cuenta con {invitation.email}. Inicia sesión para aceptar la invitación.
          </p>
          <Button className="mt-6 h-11 w-full" nativeButton={false} render={<Link href={`/login?next=/invitacion/${invitation.id}`} />}>
            Iniciar sesión
          </Button>
        </>
      ) : (
        <>
          {isGoogleEnabled && (
            <div className="mt-8">
              <GoogleButton callbackURL={`/invitacion/${invitation.id}`} label="Unirme con Google" />
              <p className="mt-2 text-xs text-muted-foreground">Usa la cuenta de Google de {invitation.email}.</p>
              <OrDivider />
            </div>
          )}
          <RegisterFromInvitationForm invitationId={invitation.id} email={invitation.email} compact={isGoogleEnabled} />
        </>
      )}
    </AuthShell>
  );
}
