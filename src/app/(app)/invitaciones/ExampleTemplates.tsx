"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { applyInvitationExample } from "@/app/(app)/invitaciones/actions";
import { INVITATION_EXAMPLES } from "@/lib/invitationExamples";
import { invitationTheme } from "@/lib/invitationThemes";
import { cn } from "@/lib/utils";

/** Ejemplos listos: se ven en /ejemplos y se copian a la invitación para modificarlos. */
export function ExampleTemplates({ highlight }: { highlight?: string }) {
  const router = useRouter();
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 font-heading text-lg font-semibold">
            <Wand2 className="size-4 text-decorative" />
            Empieza con un ejemplo
          </h3>
          <p className="text-sm text-muted-foreground">
            Copia el estilo, la foto y los textos; tus fechas y lugares no cambian. Después modifícalo como quieras.
          </p>
        </div>
        <a href="/ejemplos" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
          Ver la galería
          <ExternalLink className="size-3" />
        </a>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {INVITATION_EXAMPLES.map((example) => {
          const t = invitationTheme(example.data.theme);
          const couple = `${example.data.partner1} & ${example.data.partner2}`;
          const isHighlighted = highlight === example.slug;
          return (
            <div
              key={example.slug}
              ref={isHighlighted ? highlightRef : undefined}
              className={cn(
                "flex flex-col overflow-hidden rounded-xl border transition-all",
                isHighlighted ? "border-primary ring-2 ring-primary/30" : "border-border"
              )}
            >
              <div className="relative h-28 overflow-hidden" style={{ background: t.paper }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- foto local de ejemplo */}
                <img src={example.data.coverImageUrl} alt="" className="absolute inset-0 size-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="inv-script absolute bottom-1.5 left-0 w-full text-center text-2xl text-white">{couple}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-2.5">
                <p className="text-xs font-medium">{example.title}</p>
                <div className="mt-auto flex gap-1.5">
                  <Button
                    variant="outline"
                    size="xs"
                    nativeButton={false}
                    render={<a href={`/ejemplos/${example.slug}`} target="_blank" rel="noopener noreferrer" />}
                  >
                    Ver
                  </Button>
                  <ConfirmDeleteDialog
                    triggerRender={<Button size="xs" className="flex-1" />}
                    triggerChildren="Usar"
                    title={`¿Usar el ejemplo "${example.title}"?`}
                    description="Se reemplazarán el estilo, la foto de portada y los textos de tu invitación. Tus fechas, horas y lugares se mantienen."
                    confirmLabel="Usar ejemplo"
                    destructive={false}
                    successMessage="Ejemplo aplicado: ya puedes modificarlo"
                    onConfirm={async () => {
                      const result = await applyInvitationExample(example.slug);
                      router.refresh();
                      return result;
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
