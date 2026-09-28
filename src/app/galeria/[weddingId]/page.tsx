import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { ExternalLink, Film, Image as ImageIcon, Link2, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MEDIA_TYPE_LABEL } from "@/app/(app)/fotos/constants";

export const dynamic = "force-dynamic";

const TYPE_ICON = {
  image: ImageIcon,
  video: Film,
  map: MapPin,
  link: Link2,
} as const;

/** Galería pública (solo lectura) de una boda: se comparte con el enlace /galeria/<id>. */
export default async function PublicGalleryPage({ params }: PageProps<"/galeria/[weddingId]">) {
  const { weddingId } = await params;
  if (!ObjectId.isValid(weddingId)) notFound();

  const [items, wedding] = await Promise.all([
    prisma.mediaItem.findMany({ where: { weddingId }, orderBy: { sortOrder: "asc" } }),
    prisma.wedding.findUnique({ where: { id: weddingId } }),
  ]);
  if (!wedding) notFound();

  const coupleNames =
    wedding?.partner1 && wedding?.partner2
      ? `${wedding.partner1} & ${wedding.partner2}`
      : wedding?.partner1 || wedding?.partner2 || null;

  return (
    <div className="mx-auto min-h-full w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-10 text-center">
        {coupleNames && <p className="font-heading text-3xl font-semibold text-primary sm:text-4xl">{coupleNames}</p>}
        <p className="mt-2 font-heading text-lg text-foreground">Fotos y referencias</p>
      </div>

      {items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">Todavía no hay nada para mostrar.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = TYPE_ICON[item.type as keyof typeof TYPE_ICON] ?? Link2;
            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm transition-colors hover:bg-muted"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{item.label || "Sin nombre"}</span>
                  {item.notes && <span className="block truncate text-xs text-muted-foreground">{item.notes}</span>}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{MEDIA_TYPE_LABEL[item.type] ?? item.type}</span>
                <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
              </a>
            );
          })}
        </div>
      )}

      <p className="mt-12 text-center text-xs text-muted-foreground">Hecho con 💍 WeddingPlanner</p>
    </div>
  );
}
