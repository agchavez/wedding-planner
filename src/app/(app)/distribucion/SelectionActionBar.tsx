"use client";

import { useState, type ComponentProps } from "react";
import { useShallow } from "zustand/react/shallow";
import { toast } from "sonner";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceAround,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceAround,
  ChevronDown,
  Copy,
  Grid3x3,
  RotateCw,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { activeLayerLimit, canAddToActiveLayer, selectionBounds, useCanvasStore } from "@/app/(app)/distribucion/canvasStore";
import { useGuestSeatingStore } from "@/app/(app)/distribucion/guestSeatingStore";
import { isTableType } from "@/lib/seatGeometry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AlignMode } from "@/lib/layoutGeometry";

const ROTATE_STEP = 15;
// Separación sobre la selección: deja libre el ancla de rotación del Transformer (más lejos con el dedo).
const BAR_OFFSET = 44;
const BAR_OFFSET_TOUCH = 92;
// Media barra (aprox.) para que no se salga por los lados del lienzo.
const BAR_HALF_WIDTH = 230;

const ALIGN_OPTIONS: { mode: AlignMode; label: string; icon: LucideIcon }[] = [
  { mode: "left", label: "Alinear a la izquierda", icon: AlignStartVertical },
  { mode: "center", label: "Centrar en horizontal", icon: AlignCenterVertical },
  { mode: "right", label: "Alinear a la derecha", icon: AlignEndVertical },
  { mode: "top", label: "Alinear arriba", icon: AlignStartHorizontal },
  { mode: "middle", label: "Centrar en vertical", icon: AlignCenterHorizontal },
  { mode: "bottom", label: "Alinear abajo", icon: AlignEndHorizontal },
];

/** Aviso cuando la capa activa ya no admite más elementos. */
export function layerLimitMessage(state: { roomEditMode: boolean }) {
  return state.roomEditMode
    ? `El salón admite hasta ${activeLayerLimit(state)} elementos fijos.`
    : `La distribución admite hasta ${activeLayerLimit(state)} elementos.`;
}

/** Duplica la selección o avisa si se rebasaría el máximo de la capa. */
export function duplicateOrWarn() {
  const store = useCanvasStore.getState();
  if (!store.duplicateSelection()) toast.error(layerLimitMessage(store));
}

/** Opciones de alinear (2 o más) y distribuir (3 o más) para un menú desplegable. */
export function AlignMenuItems({ count }: { count: number }) {
  const alignSelection = useCanvasStore((s) => s.alignSelection);
  const distributeSelection = useCanvasStore((s) => s.distributeSelection);
  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuLabel>{count < 2 ? "Selecciona 2 o más para alinear" : "Alinear"}</DropdownMenuLabel>
        {ALIGN_OPTIONS.map(({ mode, label, icon: Icon }) => (
          <DropdownMenuItem key={mode} disabled={count < 2} onClick={() => alignSelection(mode)}>
            <Icon className="size-4" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuLabel>{count < 3 ? "Distribuir (3 o más)" : "Distribuir con el mismo espacio"}</DropdownMenuLabel>
        <DropdownMenuItem disabled={count < 3} onClick={() => distributeSelection("horizontal")}>
          <AlignHorizontalSpaceAround className="size-4" />
          En horizontal
        </DropdownMenuItem>
        <DropdownMenuItem disabled={count < 3} onClick={() => distributeSelection("vertical")}>
          <AlignVerticalSpaceAround className="size-4" />
          En vertical
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </>
  );
}

/** Formulario "Duplicar en filas y columnas" con la separación libre entre copias en metros. */
export function MatrixForm({ onDone }: { onDone?: () => void }) {
  const duplicateMatrix = useCanvasStore((s) => s.duplicateMatrix);
  const selectedCount = useCanvasStore((s) => s.selectedIds.length);
  const [rows, setRows] = useState("2");
  const [columns, setColumns] = useState("3");
  const [gapX, setGapX] = useState("1.2");
  const [gapY, setGapY] = useState("1.2");
  const r = Math.min(20, Math.max(1, Math.floor(Number(rows) || 1)));
  const c = Math.min(20, Math.max(1, Math.floor(Number(columns) || 1)));
  const copies = r * c - 1;
  // Cada celda repite toda la selección: no se puede pasar del máximo de la capa.
  const fits = useCanvasStore((s) => canAddToActiveLayer(s, copies * Math.max(1, selectedCount)));
  const limit = useCanvasStore((s) => activeLayerLimit(s));

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (copies < 1 || !fits) return;
        if (!duplicateMatrix(r, c, Math.max(0, Number(gapX) || 0), Math.max(0, Number(gapY) || 0))) {
          toast.error(layerLimitMessage(useCanvasStore.getState()));
          return;
        }
        onDone?.();
      }}
    >
      <p className="text-xs text-muted-foreground">
        Repite la selección en una cuadrícula. La separación es el espacio libre entre copias (pasillo); se
        recomienda 1.2 m para que pasen los meseros.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="matrix-rows">Filas</Label>
          <Input id="matrix-rows" type="number" min={1} max={20} className="mt-1" value={rows} onChange={(e) => setRows(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="matrix-columns">Columnas</Label>
          <Input
            id="matrix-columns"
            type="number"
            min={1}
            max={20}
            className="mt-1"
            value={columns}
            onChange={(e) => setColumns(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="matrix-gap-x">Entre columnas (m)</Label>
          <Input id="matrix-gap-x" type="number" min={0} step={0.1} className="mt-1" value={gapX} onChange={(e) => setGapX(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="matrix-gap-y">Entre filas (m)</Label>
          <Input id="matrix-gap-y" type="number" min={0} step={0.1} className="mt-1" value={gapY} onChange={(e) => setGapY(e.target.value)} />
        </div>
      </div>
      {!fits && (
        <p className="text-xs text-destructive">Serían demasiadas copias: el máximo es {limit} elementos en total.</p>
      )}
      <Button type="submit" size="sm" disabled={copies < 1 || !fits}>
        <Grid3x3 className="size-3.5" />
        {copies < 1 ? "Elige más de una celda" : `Crear ${copies} ${copies === 1 ? "copia" : "copias"}`}
      </Button>
    </form>
  );
}

function BarButton({ className, children, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors hover:bg-background/15 focus-visible:outline-2 focus-visible:outline-ring [&_svg]:size-3.5",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Barra contextual oscura que flota sobre lo seleccionado: Duplicar, Matriz, Girar, Alinear y
 * Eliminar. Se oculta mientras se arrastra o se mueve el plano.
 */
export function SelectionActionBar({ viewportWidth, coarsePointer = false }: { viewportWidth: number; coarsePointer?: boolean }) {
  const bounds = useCanvasStore(useShallow(selectionBounds));
  const count = useCanvasStore((s) => s.selectedIds.length);
  const interacting = useCanvasStore((s) => s.interacting);
  const zoom = useCanvasStore((s) => s.zoom);
  const stageX = useCanvasStore((s) => s.stageX);
  const stageY = useCanvasStore((s) => s.stageY);
  const rotateSelection = useCanvasStore((s) => s.rotateSelection);
  const requestDeleteSelection = useCanvasStore((s) => s.requestDeleteSelection);
  const [matrixOpen, setMatrixOpen] = useState(false);
  // Una sola mesa seleccionada: "Sentar aquí" abre la hoja para elegir invitados.
  const singleTableId = useCanvasStore((s) => {
    if (s.roomEditMode || s.selectedIds.length !== 1) return null;
    const el = s.elements.find((e) => e.id === s.selectedIds[0]);
    return el && isTableType(el.type) ? el.id : null;
  });
  const openSheet = useGuestSeatingStore((s) => s.openSheet);

  if (!bounds || count === 0 || interacting) return null;

  // Arriba y al centro de la selección (en pantalla); si no cabe arriba, va debajo.
  const centerX = ((bounds.minX + bounds.maxX) / 2) * zoom + stageX;
  const offset = coarsePointer ? BAR_OFFSET_TOUCH : BAR_OFFSET;
  const top = bounds.minY * zoom + stageY - offset;
  const below = top < 56;
  const y = below ? bounds.maxY * zoom + stageY + offset : top;
  const half = Math.min(BAR_HALF_WIDTH, viewportWidth / 2 - 8);
  const x = Math.min(viewportWidth - half - 8, Math.max(half + 8, centerX));

  return (
    <div
      className="pointer-events-auto absolute z-10 flex max-w-[calc(100%-16px)] items-center gap-0.5 overflow-x-auto rounded-xl bg-foreground p-1 text-background shadow-xl"
      style={{
        left: x,
        top: y,
        transform: `translate(-50%, ${below ? "0" : "-100%"})`,
      }}
      role="toolbar"
      aria-label="Acciones de la selección"
    >
      {count > 1 && <span className="px-2 text-xs text-background/70 tabular-nums">{count}</span>}
      <BarButton onClick={duplicateOrWarn} title="Duplicar (Ctrl+D)">
        <Copy />
        <span className="hidden sm:inline">Duplicar</span>
      </BarButton>
      <Popover open={matrixOpen} onOpenChange={setMatrixOpen}>
        <PopoverTrigger render={<BarButton title="Duplicar en filas y columnas" />}>
          <Grid3x3 />
          <span className="hidden sm:inline">Matriz</span>
        </PopoverTrigger>
        <PopoverContent side="top" sideOffset={10}>
          <MatrixForm onDone={() => setMatrixOpen(false)} />
        </PopoverContent>
      </Popover>
      <BarButton onClick={() => rotateSelection(ROTATE_STEP)} title={`Girar ${ROTATE_STEP}° (R)`}>
        <RotateCw />
        <span className="hidden sm:inline">Girar</span>
      </BarButton>
      <DropdownMenu>
        <DropdownMenuTrigger render={<BarButton title="Alinear y distribuir" />}>
          <AlignCenterVertical />
          <span className="hidden sm:inline">Alinear</span>
          <ChevronDown className="opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" sideOffset={10} className="w-60">
          <AlignMenuItems count={count} />
        </DropdownMenuContent>
      </DropdownMenu>
      {singleTableId && (
        <>
          <span className="mx-0.5 h-5 w-px shrink-0 bg-background/20" aria-hidden />
          <BarButton onClick={() => openSheet({ tableId: singleTableId, seatIndex: null })} title="Elegir invitados para esta mesa">
            <Users />
            <span className="hidden sm:inline">Sentar aquí</span>
          </BarButton>
        </>
      )}
      <span className="mx-0.5 h-5 w-px shrink-0 bg-background/20" aria-hidden />
      <BarButton onClick={requestDeleteSelection} title="Eliminar (Supr)" className="text-red-300 hover:text-red-200">
        <Trash2 />
        <span className="sr-only">Eliminar</span>
      </BarButton>
    </div>
  );
}
