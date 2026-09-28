import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { CalendarHeart, Clock, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { TIMELINE_CATEGORY_LABEL, TIMELINE_CATEGORY_COLOR } from "@/app/(app)/linea-tiempo/categories";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatTime(date: Date | null) {
  if (!date) return "Hora por definir";
  return new Intl.DateTimeFormat("es-HN", { timeStyle: "short" }).format(new Date(date));
}

function formatFullDate(date: Date | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("es-HN", { dateStyle: "full", timeZone: "UTC" }).format(new Date(date));
}

export default async function PublicAgendaPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  if (!ObjectId.isValid(eventId)) notFound();

  const event = await prisma.weddingEvent.findUnique({ where: { id: eventId } });
  if (!event) notFound();

  const [items, wedding] = await Promise.all([
    prisma.timelineEvent.findMany({ where: { eventId }, orderBy: { sortOrder: "asc" } }),
    prisma.wedding.findUnique({ where: { id: event.weddingId ?? "" } }),
  ]);

  const coupleNames =
    wedding?.partner1 && wedding?.partner2
      ? `${wedding.partner1} & ${wedding.partner2}`
      : wedding?.partner1 || wedding?.partner2 || null;

  return (
    <div className="mx-auto min-h-full w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-10 text-center">
        {coupleNames && (
          <p className="font-heading text-3xl font-semibold text-primary sm:text-4xl">{coupleNames}</p>
        )}
        <p className="mt-2 font-heading text-lg text-foreground">{event.name}</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {formatFullDate(wedding?.weddingDate ?? null) && (
            <span className="flex items-center gap-1.5">
              <CalendarHeart className="size-4" />
              {formatFullDate(wedding?.weddingDate ?? null)}
            </span>
          )}
          {wedding?.venueName && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {wedding.venueName}
            </span>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">Todavía no hay momentos programados.</p>
      ) : (
        <ol className="relative border-l-2 border-decorative/40 pl-6">
          {items.map((item) => (
            <li key={item.id} className="mb-8 last:mb-0">
              <span className="absolute -left-[9px] mt-1 flex size-4 items-center justify-center rounded-full border-2 border-decorative bg-card">
                <span className="size-1.5 rounded-full bg-primary" />
              </span>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="flex items-center gap-1 font-heading text-sm font-semibold text-primary">
                  <Clock className="size-3.5" />
                  {formatTime(item.startTime)}
                </span>
                {item.durationMinutes > 0 && (
                  <span className="text-xs text-muted-foreground">({item.durationMinutes} min)</span>
                )}
                {item.category && (
                  <Badge variant="outline" className={cn("border-transparent", TIMELINE_CATEGORY_COLOR[item.category])}>
                    {TIMELINE_CATEGORY_LABEL[item.category]}
                  </Badge>
                )}
              </div>
              <p className="mt-1 font-medium text-foreground">{item.title}</p>
              {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
            </li>
          ))}
        </ol>
      )}

      <p className="mt-12 text-center text-xs text-muted-foreground">Hecho con 💍 WeddingPlanner</p>
    </div>
  );
}
