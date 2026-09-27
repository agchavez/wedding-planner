import type { ReactNode } from "react";

const DEFAULT_TAGLINE = "Invitados, presupuesto, música, horario y el salón de tu boda, en un solo lugar.";

/** Pantalla dividida de los flujos de acceso: panel tipo invitación + contenido. */
export function AuthShell({ children, tagline = DEFAULT_TAGLINE }: { children: ReactNode; tagline?: string }) {
  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[1.1fr_1fr]">
      <InvitationPanel tagline={tagline} />
      <main className="flex items-center justify-center px-6 py-10 sm:px-10 lg:py-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}

/** Panel tipo invitación: marco fino y dos anillos entrelazados que se dibujan al cargar. */
function InvitationPanel({ tagline }: { tagline: string }) {
  return (
    <aside className="relative overflow-hidden bg-primary px-6 py-8 text-primary-foreground sm:px-10 lg:py-12">
      <div className="pointer-events-none absolute inset-3 rounded-[calc(var(--radius)*1.2)] border border-decorative/50 sm:inset-4" />
      <div className="relative flex h-full flex-col items-center justify-center gap-5 text-center lg:gap-8">
        <svg
          viewBox="0 0 220 140"
          aria-hidden="true"
          className="w-28 text-decorative sm:w-36 lg:w-64"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
        >
          <circle cx="82" cy="78" r="50" strokeWidth="3" pathLength={1} className="ring-draw" />
          <circle cx="138" cy="78" r="50" strokeWidth="3" pathLength={1} className="ring-draw ring-draw-late" />
          <path
            d="M82 14 l7 7 -7 9 -7 -9 z"
            strokeWidth="2"
            strokeLinejoin="round"
            pathLength={1}
            className="ring-draw ring-draw-late"
          />
        </svg>
        <div>
          <p className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">Wedplan</p>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-primary-foreground/80 lg:mt-4 lg:max-w-sm lg:text-base">
            {tagline}
          </p>
        </div>
      </div>
    </aside>
  );
}
