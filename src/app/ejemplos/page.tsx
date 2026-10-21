import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Eye } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { INVITATION_EXAMPLES } from "@/lib/invitationExamples";
import { INVITATION_THEMES, isInvitationTheme } from "@/lib/invitationThemes";
import { ShareExampleButtons } from "@/app/ejemplos/ShareExampleButtons";

export const metadata: Metadata = {
  title: "Invitaciones de ejemplo · Wedplan",
  description: "Invitaciones digitales de boda con confirmación de asistencia y vista previa elegante en WhatsApp.",
};

export default function EjemplosPage() {
  return (
    <div className="min-h-svh bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark className="size-8" />
          <span className="font-heading text-lg font-semibold text-primary">Wedplan</span>
        </Link>
        <Link href="/invitaciones?tab=diseno" className="text-sm font-medium text-primary hover:underline">
          Crear la mía
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-2xl py-10 text-center sm:py-16">
          <p className="text-xs font-medium tracking-[0.3em] text-decorative uppercase">Invitaciones digitales</p>
          <h1 className="mt-3 font-heading text-4xl font-semibold text-foreground sm:text-5xl">
            Así llega tu invitación por WhatsApp
          </h1>
          <p className="mt-4 text-muted-foreground">
            Cada invitado recibe su enlace personal con una tarjeta a su nombre. Abre cualquiera de estos ejemplos o
            envíatelo por WhatsApp para ver cómo se ve; después úsalo como base y modifícalo a tu gusto.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {INVITATION_EXAMPLES.map((example) => {
            const couple = `${example.data.partner1} & ${example.data.partner2}`;
            const theme = isInvitationTheme(example.data.theme) ? INVITATION_THEMES[example.data.theme] : null;
            const path = `/ejemplos/${example.slug}`;
            return (
              <article key={example.slug} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg">
                <Link href={path} className="block overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- es la misma tarjeta que ve WhatsApp */}
                  <img
                    src={`${path}/opengraph-image`}
                    alt={`Tarjeta de WhatsApp de la boda de ${couple}`}
                    width={1200}
                    height={630}
                    loading="lazy"
                    className="aspect-[1200/630] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                </Link>
                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-heading text-xl font-semibold">{couple}</h2>
                      <p className="text-sm text-muted-foreground">
                        {example.title} · {example.description}
                      </p>
                    </div>
                    {theme && (
                      <span className="flex shrink-0 gap-1 pt-1.5" title={theme.name}>
                        {[theme.paper, theme.accent, theme.gold].map((c) => (
                          <span key={c} className="size-3.5 rounded-full ring-1 ring-black/10" style={{ background: c }} />
                        ))}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                      href={path}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      <Eye className="size-4" />
                      Ver invitación
                    </Link>
                    <div className="flex-1">
                      <ShareExampleButtons path={path} couple={couple} />
                    </div>
                  </div>
                  <Link
                    href={`/invitaciones?tab=diseno&ejemplo=${example.slug}`}
                    className="flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Usar este ejemplo en mi boda
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
