import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { SongFormDialog } from "@/app/(app)/canciones/SongFormDialog";
import { SongList } from "@/app/(app)/canciones/SongList";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function CancionesPage() {
  const weddingId = await getActiveWeddingId();
  const songs = await prisma.song.findMany({ where: { weddingId }, orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Canciones"
        description="Organiza las canciones por momento del evento y arrastra para ordenar dentro de cada categoría."
        actions={
          <SongFormDialog
            triggerRender={<Button />}
            triggerChildren={
              <>
                <Plus className="size-4" />
                Agregar canción
              </>
            }
          />
        }
      />
      <SongList songs={songs} />
    </div>
  );
}
