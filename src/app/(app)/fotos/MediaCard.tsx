"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Film, FolderInput, Link2, MapPin, MoreVertical, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMediaItem, moveMediaItem } from "@/app/(app)/fotos/actions";
import { MEDIA_TYPE_LABEL } from "@/app/(app)/fotos/constants";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useWeddingAccess } from "@/components/WeddingAccess";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MEDIA_FOLDERS, driveThumbnail, type MediaFolder } from "@/lib/mediaFolders";
import type { MediaItem } from "@/generated/prisma";

const TYPE_ICON: Record<string, typeof Link2> = { video: Film, map: MapPin, link: Link2 };

/** Elemento de Fotos con vista previa (fotos y videos de Drive) y acciones. */
export function MediaTile({ item, folder }: { item: MediaItem; folder: MediaFolder }) {
  const { canEdit } = useWeddingAccess();
  const [broken, setBroken] = useState(false);
  const [isPending, startTransition] = useTransition();
  const hasPreview = !broken && Boolean(item.driveFileId) && (item.type === "image" || item.type === "video");
  const Icon = TYPE_ICON[item.type] ?? Link2;

  function move(target: MediaFolder) {
    startTransition(async () => {
      try {
        await moveMediaItem(item.id, target);
        toast.success(`Movido a ${MEDIA_FOLDERS.find((f) => f.key === target)!.label}`);
      } catch {
        toast.error("No se pudo mover. Inténtalo de nuevo.");
      }
    });
  }

  return (
    <div className={`group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm ${isPending ? "opacity-60" : ""}`}>
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
        <div className="relative aspect-square bg-muted">
          {hasPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={driveThumbnail(item.driveFileId!, 500)}
              alt={item.label || "Foto"}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setBroken(true)}
              className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <span className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Icon className="size-5" />
              </span>
              <span className="text-xs">{MEDIA_TYPE_LABEL[item.type] ?? item.type}</span>
            </div>
          )}
          {hasPreview && item.type === "video" && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur">
                <Play className="size-4 translate-x-px" />
              </span>
            </span>
          )}
        </div>
      </a>

      <div className="flex items-center gap-1 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{item.label || "Sin nombre"}</p>
          {item.notes && <p className="truncate text-xs text-muted-foreground">{item.notes}</p>}
        </div>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" disabled={isPending} />}>
              <MoreVertical className="size-4" />
              <span className="sr-only">Opciones</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<a href={item.url} target="_blank" rel="noopener noreferrer" />}>
                <ExternalLink className="size-4" />
                Abrir
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Mover a</DropdownMenuLabel>
                {MEDIA_FOLDERS.filter((f) => f.key !== folder).map((f) => (
                  <DropdownMenuItem key={f.key} onClick={() => move(f.key)}>
                    <FolderInput className="size-4" />
                    {f.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <ConfirmDeleteDialog
          triggerRender={<Button variant="ghost" size="icon-sm" disabled={isPending} />}
          triggerChildren={
            <>
              <Trash2 className="size-3.5 text-destructive" />
              <span className="sr-only">Eliminar</span>
            </>
          }
          title={`¿Eliminar "${item.label || "este elemento"}"?`}
          description={item.driveFileId ? "También se borra el archivo de Google Drive. No se puede deshacer." : "Esta acción no se puede deshacer."}
          onConfirm={() => deleteMediaItem(item.id)}
          successMessage="Eliminado de Fotos"
        />
      </div>
    </div>
  );
}
