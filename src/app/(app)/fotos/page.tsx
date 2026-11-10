import Link from "next/link";
import { ChevronLeft, ChevronRight, FolderOpen, Images, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { driveFolderLinks, getDriveConnection, isGoogleDriveConfigured } from "@/lib/googleDrive";
import { MEDIA_FOLDERS, folderWhere, parseMediaFolder, type MediaFolder } from "@/lib/mediaFolders";
import { MediaFormDialog } from "@/app/(app)/fotos/MediaFormDialog";
import { MediaTile } from "@/app/(app)/fotos/MediaCard";
import { DriveConnectionCard } from "@/app/(app)/fotos/DriveConnectionCard";
import { GuestShareCard } from "@/app/(app)/fotos/GuestShareCard";
import { ShareGalleryButton } from "@/app/(app)/fotos/ShareGalleryButton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function FotosPage({ searchParams }: PageProps<"/fotos">) {
  const sp = await searchParams;
  const weddingId = await getActiveWeddingId();
  const folder = parseMediaFolder(one(sp.carpeta) ?? "invitacion");
  const requestedPage = Math.max(1, Number.parseInt(one(sp.pagina) ?? "1", 10) || 1);

  const [connection, counts] = await Promise.all([
    getDriveConnection(),
    Promise.all(MEDIA_FOLDERS.map((f) => prisma.mediaItem.count({ where: { weddingId, ...folderWhere(f.key) } }))),
  ]);
  const countBy = Object.fromEntries(MEDIA_FOLDERS.map((f, i) => [f.key, counts[i]])) as Record<MediaFolder, number>;
  const total = countBy[folder];
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pages);

  const items = await prisma.mediaItem.findMany({
    where: { weddingId, ...folderWhere(folder) },
    orderBy: folder === "boda" ? { createdAt: "desc" } : { sortOrder: "asc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const current = MEDIA_FOLDERS.find((f) => f.key === folder)!;
  const folderLinks = driveFolderLinks(connection);
  const driveConnected = Boolean(connection?.accountEmail);
  const href = (f: MediaFolder, p = 1) => `/fotos?carpeta=${f}${p > 1 ? `&pagina=${p}` : ""}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fotos"
        description="Fotos de la invitación, las que comparten los invitados el día de la boda y tus referencias, ordenadas en carpetas."
        actions={
          <>
            <ShareGalleryButton weddingId={weddingId} />
            <MediaFormDialog
              key={folder}
              driveConnected={driveConnected}
              defaultFolder={folder}
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

      {/* Carpetas */}
      <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Carpetas">
        {MEDIA_FOLDERS.map((f) => (
          <Link
            key={f.key}
            href={href(f.key)}
            aria-current={f.key === folder ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors",
              f.key === folder
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted"
            )}
          >
            {f.label}
            <span className={cn("text-xs", f.key === folder ? "text-primary-foreground/80" : "text-muted-foreground")}>
              {countBy[f.key]}
            </span>
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{current.description}</p>
        {folderLinks[folder] && (
          <Button variant="outline" size="sm" render={<a href={folderLinks[folder]} target="_blank" rel="noopener noreferrer" />}>
            <FolderOpen className="size-3.5" />
            Abrir en Drive
          </Button>
        )}
      </div>

      {folder === "boda" && <GuestShareCard weddingId={weddingId} />}

      {items.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Esta carpeta está vacía"
          description={
            folder === "boda"
              ? "Aquí llegarán las fotos que suban los invitados con el QR de las mesas."
              : "Toca Agregar para subir fotos o videos, o guardar un link."
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <MediaTile key={item.id} item={item} folder={folder} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Páginas">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            render={page > 1 ? <Link href={href(folder, page - 1)} /> : undefined}
          >
            <ChevronLeft className="size-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            render={page < pages ? <Link href={href(folder, page + 1)} /> : undefined}
          >
            Siguiente
            <ChevronRight className="size-4" />
          </Button>
        </nav>
      )}
    </div>
  );
}
