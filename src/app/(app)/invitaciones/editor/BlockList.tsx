"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BLOCK_INFO, BLOCK_TYPES, type BlockType, type InvitationBlock } from "@/lib/invitationBlocks";
import { cn } from "@/lib/utils";

export type BlockListActions = {
  onSelect: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onToggleHidden: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
};

function Item({ block, selected, disabled, actions }: { block: InvitationBlock; selected: boolean; disabled?: boolean; actions: BlockListActions }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id, disabled });
  const info = BLOCK_INFO[block.type];
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex items-center gap-1 rounded-lg border bg-card py-1 pr-1 pl-0.5 text-sm transition-colors",
        selected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40",
        isDragging && "z-10 shadow-lg",
        block.hidden && "opacity-60"
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        className="flex size-9 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label={`Arrastrar ${info.label} para reordenar`}
      >
        <GripVertical className="size-4" />
      </button>
      <button type="button" onClick={() => actions.onSelect(block.id)} className="min-w-0 flex-1 truncate py-1.5 text-left">
        <span className={cn(block.hidden && "line-through decoration-muted-foreground/60")}>{info.label}</span>
      </button>
      {!disabled && (
        <div className="flex shrink-0 items-center">
          {block.type !== "rsvp" && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => actions.onToggleHidden(block.id)}
              aria-label={block.hidden ? `Mostrar ${info.label}` : `Ocultar ${info.label}`}
              title={block.hidden ? "Mostrar" : "Ocultar"}
            >
              {block.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </Button>
          )}
          {block.type !== "rsvp" && (
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => actions.onDuplicate(block.id)} aria-label={`Duplicar ${info.label}`} title="Duplicar">
              <Copy className="size-3.5" />
            </Button>
          )}
          {info.removable && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => actions.onDelete(block.id)}
              aria-label={`Eliminar ${info.label}`}
              title="Eliminar"
              className="hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

/** Lista de bloques que se ordena arrastrando (mouse, dedo o teclado). */
export function BlockList({
  blocks,
  selectedId,
  disabled,
  actions,
}: {
  blocks: InvitationBlock[];
  selectedId: string | null;
  disabled?: boolean;
  actions: BlockListActions;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((b) => b.id === active.id);
    const to = blocks.findIndex((b) => b.id === over.id);
    if (from !== -1 && to !== -1) actions.onMove(from, to);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <ol className="space-y-1.5">
          {blocks.map((b) => (
            <Item key={b.id} block={b} selected={b.id === selectedId} disabled={disabled} actions={actions} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

/** Menú "+ Agregar bloque" (la confirmación es única y no se agrega). */
export function AddBlockMenu({ onAdd, disabled, className }: { onAdd: (type: BlockType) => void; disabled?: boolean; className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" disabled={disabled} className={className} />}>
        <Plus className="size-3.5" />
        Agregar bloque
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-80 w-64 overflow-y-auto">
        {BLOCK_TYPES.filter((t) => t !== "rsvp").map((t) => (
          <DropdownMenuItem key={t} onClick={() => onAdd(t)} className="flex-col items-start gap-0">
            <span>{BLOCK_INFO[t].label}</span>
            <span className="text-xs text-muted-foreground">{BLOCK_INFO[t].description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
