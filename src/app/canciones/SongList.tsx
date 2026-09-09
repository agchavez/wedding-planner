"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { deleteSong, reorderSongs } from "@/app/canciones/actions";
import { SONG_CATEGORY_LABEL, SONG_CATEGORY_OPTIONS } from "@/app/canciones/categories";
import { SongFormDialog } from "@/app/canciones/SongFormDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Song } from "@/generated/prisma";

function SongItem({ song }: { song: Song }) {
  const [, startTransition] = useTransition();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: song.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          aria-label="Arrastrar para reordenar"
        >
          <GripVertical className="size-4" />
        </button>
        <div>
          <p className="flex items-center gap-2 font-medium text-foreground">
            {song.title}
            {song.mustPlay && (
              <Badge variant="outline" className="border-transparent bg-emerald-100 text-emerald-800">
                Obligatoria
              </Badge>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {song.artist || "Artista desconocido"}
            {song.requestedBy ? ` · Pedida por ${song.requestedBy}` : ""}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <SongFormDialog
          song={song}
          triggerRender={<Button variant="outline" size="icon-sm" />}
          triggerChildren={
            <>
              <Pencil className="size-3.5" />
              <span className="sr-only">Editar</span>
            </>
          }
        />
        <ConfirmDeleteDialog
          triggerRender={<Button variant="outline" size="icon-sm" />}
          triggerChildren={
            <>
              <Trash2 className="size-3.5 text-destructive" />
              <span className="sr-only">Eliminar</span>
            </>
          }
          title={`¿Eliminar la canción "${song.title}"?`}
          description="Esta acción no se puede deshacer."
          onConfirm={() => startTransition(() => deleteSong(song.id))}
        />
      </div>
    </div>
  );
}

function CategoryGroup({ category, songs }: { category: string; songs: Song[] }) {
  const [items, setItems] = useState(songs);
  const [prevSongs, setPrevSongs] = useState(songs);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  if (songs !== prevSongs) {
    setPrevSongs(songs);
    setItems(songs);
  }

  if (items.length === 0) return null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((current) => {
      const oldIndex = current.findIndex((s) => s.id === active.id);
      const newIndex = current.findIndex((s) => s.id === over.id);
      const reordered = arrayMove(current, oldIndex, newIndex);
      reorderSongs(reordered.map((s) => s.id));
      return reordered;
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{SONG_CATEGORY_LABEL[category] ?? category}</CardTitle>
      </CardHeader>
      <CardContent>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((song) => (
                <SongItem key={song.id} song={song} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
}

export function SongList({ songs }: { songs: Song[] }) {
  const grouped = useMemo(() => {
    const groups = new Map<string, Song[]>();
    for (const song of songs) {
      const list = groups.get(song.category) ?? [];
      list.push(song);
      groups.set(song.category, list);
    }
    for (const list of groups.values()) list.sort((a, b) => a.sortOrder - b.sortOrder);
    return groups;
  }, [songs]);

  if (songs.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay canciones agregadas.</p>;
  }

  return (
    <div className="space-y-4">
      {SONG_CATEGORY_OPTIONS.filter((opt) => grouped.has(opt.value)).map((opt) => (
        <CategoryGroup key={opt.value} category={opt.value} songs={grouped.get(opt.value)!} />
      ))}
    </div>
  );
}
