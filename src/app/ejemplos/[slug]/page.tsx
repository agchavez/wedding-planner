import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvitationExperience } from "@/components/invitation/InvitationExperience";
import { invitationFontClasses } from "@/components/invitation/fonts";
import { findInvitationExample, INVITATION_EXAMPLES } from "@/lib/invitationExamples";
import { invitationTheme } from "@/lib/invitationThemes";
import { formatEventDay } from "@/lib/eventTime";
import { firstName } from "@/lib/invitationMessage";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return INVITATION_EXAMPLES.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const example = findInvitationExample((await params).slug);
  if (!example) return { title: "Invitación de ejemplo" };
  const { data, guest } = example;
  const couple = `${data.partner1} & ${data.partner2}`;
  const day = data.ceremonyTime ? formatEventDay(data.ceremonyTime) : "";
  const title = `${firstName(guest.fullName)}, te invitamos a la boda de ${couple}`;
  const description = `${day && day[0].toUpperCase() + day.slice(1)} · ${data.ceremonyPlace}. Abre tu invitación y confirma tu asistencia 💌`;
  return {
    title: `Boda de ${couple} · Ejemplo`,
    description,
    openGraph: { type: "website", siteName: couple, locale: "es_HN", title, description, url: `/ejemplos/${example.slug}` },
    twitter: { card: "summary_large_image", title, description },
    other: { "theme-color": invitationTheme(data.theme).background },
  };
}

/** Invitación de ejemplo pública: misma experiencia que la de un invitado real, sin RSVP. */
export default async function ExamplePage({ params }: Props) {
  const example = findInvitationExample((await params).slug);
  if (!example) notFound();
  return (
    <main className={invitationFontClasses}>
      <InvitationExperience data={example.data} guest={example.guest} />
    </main>
  );
}
