"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createLabel, deleteLabel, updateLabel } from "@/app/(app)/invitados/labels-actions";
import { LabelChip } from "@/app/(app)/invitados/LabelChip";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWeddingAccess } from "@/components/WeddingAccess";
import { LABEL_COLORS, type LabelColor, type LabelOption } from "@/lib/guestLabels";
import { cn } from "@/lib/utils";
import { Tags } from "lucide-react";

function ColorPicker({ value, onChange, disabled }: { value: string; onChange: (c: LabelColor) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-1">
      {(Object.entries(LABEL_COLORS) as [LabelColor, (typeof LABEL_COLORS)[LabelColor]][]).map(([key, c]) => (
        <button
          key={key}
          type="button"
          disabled={disabled}
          onClick={() => onChange(key)}
          title={c.name}
          aria-label={c.name}
          className={cn("size-5 rounded-full ring-offset-2 ring-offset-card transition", value === key && "ring-2 ring-foreground/40")}
          style={{ background: c.dot }}
        />
      ))}
    </div>
  );
}

function LabelRow({ label, count }: { label: LabelOption; count: number }) {
  const { canEdit } = useWeddingAccess();
  const [name, setName] = useState(label.name);
  const [, startTransition] = useTransition();

  function save(next: { name?: string; color?: string }) {
    startTransition(async () => {
      const result = await updateLabel(label.id, { name: next.name ?? name, color: next.color ?? label.color });
      if (!result.ok) {
        toast.error(result.error);
        setName(label.name);
      }
    });
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-3">
        <LabelChip name={name || label.name} color={label.color} />
        <span className="text-xs text-muted-foreground">
          {count} {count === 1 ? "invitado" : "invitados"}
        </span>
      </div>
      {canEdit && (
        <div className="flex items-center gap-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() !== label.name && save({ name })}
            className="h-8 w-40"
            aria-label="Nombre"
          />
          <ColorPicker value={label.color} onChange={(color) => save({ color })} />
          <ConfirmDeleteDialog
            triggerRender={<Button variant="ghost" size="icon-sm" />}
            triggerChildren={
              <>
                <Trash2 className="size-3.5 text-destructive" />
                <span className="sr-only">Eliminar</span>
              </>
            }
            title={`¿Eliminar la etiqueta "${label.name}"?`}
            description="Se quitará de los invitados que la tienen. Esta acción no se puede deshacer."
            onConfirm={() => deleteLabel(label.id)}
            successMessage="Etiqueta eliminada"
          />
        </div>
      )}
    </li>
  );
}

/** Etiquetas de invitados: crear, renombrar, cambiar color y eliminar. */
export function LabelManager({ labels, counts }: { labels: LabelOption[]; counts: Record<string, number> }) {
  const { canEdit } = useWeddingAccess();
  const [name, setName] = useState("");
  const [color, setColor] = useState<LabelColor>("rose");
  const [isPending, startTransition] = useTransition();

  function create() {
    startTransition(async () => {
      const result = await createLabel(name, color);
      if (!result.ok) toast.error(result.error);
      else {
        setName("");
        toast.success("Etiqueta creada");
      }
    });
  }

  return (
    <div className="space-y-3">
      {canEdit && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center"
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Trabajo, Universidad, VIP" className="sm:w-64" />
          <ColorPicker value={color} onChange={setColor} />
          <Button type="submit" size="sm" disabled={isPending || !name.trim()} className="sm:ml-auto">
            <Plus className="size-3.5" />
            Agregar etiqueta
          </Button>
        </form>
      )}
      {labels.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Todavía no hay etiquetas"
          description="Las etiquetas te ayudan a filtrar invitados y enviar invitaciones por grupos (ej. «Trabajo», «Iglesia», «VIP»)."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {labels.map((l) => (
            <LabelRow key={l.id} label={l} count={counts[l.id] ?? 0} />
          ))}
        </ul>
      )}
    </div>
  );
}
