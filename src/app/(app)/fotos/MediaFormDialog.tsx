"use client";

import { useRef, useState, useTransition, type ReactElement, type ReactNode } from "react";
import { toast } from "sonner";
import { useWeddingAccess } from "@/components/WeddingAccess";
import { createMediaItem } from "@/app/(app)/fotos/actions";
import { MEDIA_TYPE_OPTIONS } from "@/app/(app)/fotos/constants";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileDropzone } from "@/components/ui/dropzone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function MediaFormDialog({
  driveConnected,
  triggerRender,
  triggerChildren,
}: {
  driveConnected: boolean;
  triggerRender: ReactElement;
  triggerChildren: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { canEdit } = useWeddingAccess();
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<string>("image");

  const canUpload = driveConnected && (type === "image" || type === "video");

  // Los roles de solo lectura no ven controles de edición (el servidor también lo impide).
  if (!canEdit) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerRender}>{triggerChildren}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar foto, video o link</DialogTitle>
        </DialogHeader>
        <form
          ref={formRef}
          id="media-form"
          action={(formData) => {
            startTransition(async () => {
              try {
                await createMediaItem(formData);
                formRef.current?.reset();
                setType("image");
                setOpen(false);
                toast.success("Agregado a Fotos");
              } catch {
                toast.error("No se pudo guardar el cambio. Revisa los datos e inténtalo de nuevo.");
              }
            });
          }}
          className="space-y-3"
        >
          <div>
            <Label htmlFor="type">Tipo</Label>
            <Select name="type" value={type} onValueChange={(v) => v && setType(v)}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEDIA_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canUpload && (
            <div>
              <Label htmlFor="file">Subir archivo a Google Drive</Label>
              <FileDropzone name="file" accept={type === "video" ? "video/*" : "image/*"} className="mt-1" />
            </div>
          )}

          <div>
            <Label htmlFor="url">{canUpload ? "…o pega un link" : "Link"}</Label>
            <Input
              id="url"
              name="url"
              type="url"
              placeholder="https://…"
              required={!canUpload}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="label">Nombre</Label>
            <Input id="label" name="label" placeholder="Ej. Fachada del salón" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" rows={2} className="mt-1" />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="media-form" disabled={isPending}>
            {isPending ? "Guardando..." : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
