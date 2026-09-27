"use client";

import { useRef, useState, useTransition, type ReactElement, type ReactNode } from "react";
import { createSong, updateSong } from "@/app/(app)/canciones/actions";
import { SONG_CATEGORY_LABEL, SONG_CATEGORY_OPTIONS } from "@/app/(app)/canciones/categories";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Song } from "@/generated/prisma";

export function SongFormDialog({
  song,
  triggerRender,
  triggerChildren,
}: {
  song?: Song;
  triggerRender: ReactElement;
  triggerChildren: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = Boolean(song);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerRender}>{triggerChildren}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar canción" : "Agregar canción"}</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          id="song-form"
          action={(formData) => {
            startTransition(async () => {
              if (song) {
                await updateSong(song.id, formData);
              } else {
                await createSong(formData);
              }
              formRef.current?.reset();
              setOpen(false);
            });
          }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" defaultValue={song?.title} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="artist">Artista</Label>
            <Input id="artist" name="artist" defaultValue={song?.artist} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="category">Categoría</Label>
            <Select name="category" defaultValue={song?.category ?? "other"}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue>{(value: string) => SONG_CATEGORY_LABEL[value] ?? value}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SONG_CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="requestedBy">Pedida por</Label>
            <Input id="requestedBy" name="requestedBy" defaultValue={song?.requestedBy} className="mt-1" />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox name="mustPlay" defaultChecked={song?.mustPlay} />
            Debe tocarse sí o sí
          </label>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="song-form" disabled={isPending}>
            {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Agregar canción"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
