import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { requireSession } from "@/lib/session";
import { listPendingInvitations, listUserWeddings } from "@/lib/wedding";
import { CreateWeddingForm, PendingInvitations } from "@/app/bienvenida/WelcomeForms";

export const metadata: Metadata = { title: "Tu boda · Wedplan" };

export default async function BienvenidaPage({ searchParams }: PageProps<"/bienvenida">) {
  const { user } = await requireSession();
  const creatingAnother = (await searchParams).nueva === "1";
  const [weddings, invitations] = await Promise.all([listUserWeddings(user.id), listPendingInvitations(user.email)]);
  if (weddings.length > 0 && !creatingAnother && invitations.length === 0) redirect("/");

  const firstName = user.name.split(" ")[0];

  return (
    <AuthShell tagline="Crea tu boda o únete a la que te invitaron. Luego podrás invitar a tu pareja y a quien te ayude a organizarla.">
      <h1 className="font-heading text-4xl font-semibold text-foreground">
        {creatingAnother ? "Nueva boda" : `Hola, ${firstName}`}
      </h1>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">
        {invitations.length > 0
          ? "Tienes invitaciones pendientes. Acepta una o crea tu propia boda."
          : "Cuéntanos quiénes se casan para preparar tu espacio."}
      </p>
      {invitations.length > 0 && <PendingInvitations invitations={invitations} />}
      <CreateWeddingForm showHeading={invitations.length > 0} cancelHref={weddings.length > 0 ? "/" : null} />
    </AuthShell>
  );
}
