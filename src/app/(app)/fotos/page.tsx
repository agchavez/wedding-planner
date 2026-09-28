import { Images, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { isGoogleDriveConfigured, getDriveConnection } from "@/lib/googleDrive";
import { MediaFormDialog } from "@/app/(app)/fotos/MediaFormDialog";
import { MediaCard } from "@/app/(app)/fotos/MediaCard";
import { DriveConnectionCard } from "@/app/(app)/fotos/DriveConnectionCard";
import { ShareGalleryButton } from "@/app/(app)/fotos/ShareGalleryButton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function FotosPage() {
  const weddingId = await getActiveWeddingId();
  const [items, connection] = await Promise.all([
    prisma.mediaItem.findMany({ where: { weddingId }, orderBy: { sortOrder: "asc" } }),
    getDriveConnection(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fotos"
        description="Fotos, videos, mapas y links de referencia de la boda — compártelos con quien quieras."
        actions={
          <>
            <ShareGalleryButton weddingId={weddingId} />
            <MediaFormDialog
              driveConnected={Boolean(connection?.accountEmail)}
              triggerRender={<Button />}
              triggerChildren={
                <>
                  <Plus className="size-4" />
                  Agregar
                </>
              }
            />
          </>
        }
      />

      <DriveConnectionCard configured={isGoogleDriveConfigured()} accountEmail={connection?.accountEmail || null} />

      {items.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Todavía no hay nada aquí"
          description="Guarda fotos del lugar, videos de inspiración, la ubicación en Google Maps o cualquier link útil."
        />
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
