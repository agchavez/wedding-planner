import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { isGoogleDriveConfigured, getDriveConnection } from "@/lib/googleDrive";
import { MediaFormDialog } from "@/app/(app)/fotos/MediaFormDialog";
import { MediaCard } from "@/app/(app)/fotos/MediaCard";
import { DriveConnectionCard } from "@/app/(app)/fotos/DriveConnectionCard";
import { ShareGalleryButton } from "@/app/(app)/fotos/ShareGalleryButton";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function FotosPage() {
  const weddingId = await getActiveWeddingId();
  const [items, connection] = await Promise.all([
    prisma.mediaItem.findMany({ where: { weddingId }, orderBy: { sortOrder: "asc" } }),
    getDriveConnection(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">Fotos</h1>
          <p className="text-sm text-muted-foreground">
            Fotos, videos, mapas y links de referencia de la boda — compártelos con quien quieras.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ShareGalleryButton weddingId={weddingId} />
          <MediaFormDialog
            driveConnected={Boolean(connection?.accountEmail)}
            triggerRender={<Button size="sm" />}
            triggerChildren={
              <>
                <Plus className="size-3.5" />
                Agregar
              </>
            }
          />
        </div>
      </div>

      <DriveConnectionCard configured={isGoogleDriveConfigured()} accountEmail={connection?.accountEmail || null} />

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay nada aquí. Agrega la primera foto, video o link arriba.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
