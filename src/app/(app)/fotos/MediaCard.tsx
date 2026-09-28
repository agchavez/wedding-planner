"use client";

import { useTransition } from "react";
import { ExternalLink, Film, Image as ImageIcon, Link2, MapPin, Trash2 } from "lucide-react";
import { deleteMediaItem } from "@/app/(app)/fotos/actions";
import { MEDIA_TYPE_LABEL } from "@/app/(app)/fotos/constants";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MediaItem } from "@/generated/prisma";

const TYPE_ICON: Record<string, typeof ImageIcon> = {
  image: ImageIcon,
  video: Film,
  map: MapPin,
  link: Link2,
};

export function MediaCard({ item }: { item: MediaItem }) {
  const [, startTransition] = useTransition();
  const Icon = TYPE_ICON[item.type] ?? Link2;

  return (
    <Card size="sm">
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium text-foreground">{item.label || "Sin nombre"}</p>
              <Badge variant="secondary">{MEDIA_TYPE_LABEL[item.type] ?? item.type}</Badge>
            </div>
            {item.notes && <p className="truncate text-xs text-muted-foreground">{item.notes}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="icon-sm" render={<a href={item.url} target="_blank" rel="noopener noreferrer" />}>
            <ExternalLink className="size-3.5" />
            <span className="sr-only">Abrir</span>
          </Button>
          <ConfirmDeleteDialog
            triggerRender={<Button variant="outline" size="icon-sm" />}
            triggerChildren={
              <>
                <Trash2 className="size-3.5 text-destructive" />
                <span className="sr-only">Eliminar</span>
              </>
            }
            title={`¿Eliminar "${item.label || "este elemento"}"?`}
            description="Esta acción no se puede deshacer."
            onConfirm={() => startTransition(() => deleteMediaItem(item.id))}
          />
        </div>
      </CardContent>
    </Card>
  );
}
