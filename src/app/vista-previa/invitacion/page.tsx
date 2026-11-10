import type { Metadata } from "next";
import { InvitationExperience } from "@/components/invitation/InvitationExperience";
import { invitationFontClasses } from "@/components/invitation/fonts";
import { loadDraftInvitation, sampleGuest } from "@/app/vista-previa/draft";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Vista previa de la invitación", robots: { index: false, follow: false } };

/** "Ver como invitado" del editor: el borrador completo, con apertura y animaciones, sin RSVP real. */
export default async function DraftInvitationPreview({ searchParams }: PageProps<"/vista-previa/invitacion">) {
  const sp = await searchParams;
  const { data, draft } = await loadDraftInvitation();
  const guest = sampleGuest(sp.nombre, sp.lugares);
  return (
    <main className={invitationFontClasses}>
      <InvitationExperience
        data={data}
        design={draft}
        guest={{
          fullName: guest.name,
          seats: guest.seats,
          plusOneNames: [],
          rsvpStatus: "pending",
          attendingCount: null,
          rsvpMessage: "",
          dietaryRestrictions: "",
          responded: false,
        }}
      />
      <p className="pointer-events-none fixed top-3 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-[#343a26]/85 px-3 py-1 text-[11px] tracking-wide text-[#f2eee3] shadow">
        Vista previa del borrador
      </p>
    </main>
  );
}
