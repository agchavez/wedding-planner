import type { Wedding } from "@/generated/prisma";
import { formatCalendarDate } from "@/lib/format";

export function WeddingForm({ wedding }: { wedding: Wedding }) {
  return (
    <div className="text-center">
      <p className="font-heading text-4xl font-semibold text-primary sm:text-5xl">
        {wedding.partner1 || "Novia/o 1"}
        <span className="mx-3 text-decorative">&amp;</span>
        {wedding.partner2 || "Novia/o 2"}
      </p>
      <div className="mx-auto my-4 h-px w-24 bg-decorative" />
      <p className="text-base text-muted-foreground">
        {wedding.weddingDate
          ? formatCalendarDate(wedding.weddingDate, "full")
          : "Fecha por definir"}
      </p>
      <p className="text-sm text-muted-foreground">{wedding.venueName || "Lugar por definir"}</p>
      <p className="mt-4 text-xs text-muted-foreground">
        Edita estos datos desde <span className="font-medium text-foreground">Ajustes → La boda</span>.
      </p>
    </div>
  );
}
