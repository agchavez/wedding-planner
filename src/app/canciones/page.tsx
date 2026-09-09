import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { SongFormDialog } from "@/app/canciones/SongFormDialog";
import { SongList } from "@/app/canciones/SongList";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CancionesPage() {
  const weddingId = await getActiveWeddingId();
  const songs = await prisma.song.findMany({ where: { weddingId }, orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">Canciones</h1>
          <p className="text-sm text-muted-foreground">
            Organiza las canciones por momento del evento y arrastra para ordenar dentro de cada categoría.
          </p>
        </div>
        <SongFormDialog
          triggerRender={<Button />}
          triggerChildren={
            <>
              <Plus className="size-4" />
              Agregar canción
            </>
          }
        />
      </div>
      <SongList songs={songs} />
    </div>
  );
}
