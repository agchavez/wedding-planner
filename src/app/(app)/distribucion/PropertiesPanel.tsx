"use client";

import { useState } from "react";
import { AlignCenterVertical, Copy, Grid3x3, Trash2 } from "lucide-react";
import { useCanvasStore } from "@/app/(app)/distribucion/canvasStore";
import { AlignMenuItems, duplicateOrWarn, MatrixForm } from "@/app/(app)/distribucion/SelectionActionBar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ELEMENT_LABELS, isChairBlock, isTableType, type ElementType } from "@/lib/seatGeometry";
import { FIXTURE_LABELS, type FixtureType } from "@/lib/roomFixtures";
import { clampMetersToPx, pxToMeters, resolvePxPerMeter, roundMeters, stepAlignedBounds } from "@/lib/layoutUnits";

// Límites en píxeles del lienzo (los mismos que sanitizeElement en lib/seatingLayout.ts).
const ELEMENT_MIN_PX = 20;
const ELEMENT_MAX_PX = 900;
const FIXTURE_MIN_PX = 2;
const FIXTURE_MAX_PX = 4000;
// Posición: los mismos límites que sanitizeRoomFixture (x/y en el lienzo).
const POSITION_MIN_PX = -2000;
const POSITION_MAX_PX = 6000;
const METERS_STEP = 0.05;

/**
 * Input de una medida en metros; el valor real se guarda en píxeles del lienzo. Mientras se
 * escribe se conserva el texto tal cual (p. ej. "1." o vacío) y solo se aplica si es válido;
 * si hubo que ajustarlo a los límites, el campo muestra el valor que de verdad se guardó.
 */
function MetersInput({
  id,
  label,
  px,
  pxPerMeter,
  minPx,
  maxPx,
  disabled,
  allowNonPositive,
  onChange,
}: {
  id: string;
  label: string;
  px: number;
  pxPerMeter: number;
  minPx: number;
  maxPx: number;
  disabled?: boolean;
  /** Para posiciones: 0 y negativos son válidos (no así para medidas). */
  allowNonPositive?: boolean;
  onChange: (px: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const bounds = stepAlignedBounds(minPx, maxPx, pxPerMeter, METERS_STEP);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        step={METERS_STEP}
        min={bounds.min}
        max={bounds.max}
        className="mt-1"
        disabled={disabled}
        value={draft ?? String(roundMeters(pxToMeters(px, pxPerMeter)))}
        onChange={(e) => {
          setDraft(e.target.value);
          const meters = Number(e.target.value);
          if (e.target.value === "" || !Number.isFinite(meters) || (!allowNonPositive && meters <= 0)) return;
          const { px: next, clamped } = clampMetersToPx(meters, pxPerMeter, minPx, maxPx);
          if (clamped) setDraft(String(roundMeters(pxToMeters(next, pxPerMeter))));
          onChange(next);
        }}
        onBlur={() => setDraft(null)}
      />
    </div>
  );
}

export function PropertiesPanel() {
  const roomEditMode = useCanvasStore((s) => s.roomEditMode);
  return roomEditMode ? <FixturePropertiesPanel /> : <ElementPropertiesPanel />;
}

function ElementPropertiesPanel() {
  const elements = useCanvasStore((s) => s.elements);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const removeElement = useCanvasStore((s) => s.removeElement);
  const select = useCanvasStore((s) => s.select);
  const pxPerMeter = resolvePxPerMeter(useCanvasStore((s) => s.pxPerMeter));

  if (selectedIds.length > 1) return <MultiSelectionPanel count={selectedIds.length} />;
  const selected = elements.find((el) => el.id === selectedIds[0]);

  if (!selected) {
    return (
      <Card>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Selecciona un elemento del plano para ver y editar sus propiedades.</p>
          <p className="text-xs">
            Shift + clic o arrastrar en vacío selecciona varios · flechas para mover (Shift = 50 cm) · Ctrl+D
            duplica · Supr elimina · Ctrl+Z deshace.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isTable = isTableType(selected.type as ElementType);
  const isChairs = isChairBlock(selected.type as ElementType);

  return (
    <Card>
      <CardContent className="space-y-3">
        <header>
          <p className="text-[10.5px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {ELEMENT_LABELS[selected.type as ElementType]}
          </p>
          <h3 className="font-heading text-xl font-semibold text-foreground italic">
            {selected.label || ELEMENT_LABELS[selected.type as ElementType]}
          </h3>
        </header>

        <div>
          <Label htmlFor="prop-label">Etiqueta</Label>
          <Input
            id="prop-label"
            className="mt-1"
            value={selected.label}
            onChange={(e) => updateElement(selected.id, { label: e.target.value })}
          />
        </div>

        {isTable && (
          <>
            <div>
              <Label htmlFor="prop-table-number">Número de mesa</Label>
              <Input
                id="prop-table-number"
                type="number"
                min={1}
                className="mt-1"
                value={selected.tableNumber ?? 1}
                onChange={(e) => updateElement(selected.id, { tableNumber: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="prop-capacity">Capacidad (personas)</Label>
              <Input
                id="prop-capacity"
                type="number"
                min={1}
                max={24}
                className="mt-1"
                value={selected.capacity ?? 1}
                onChange={(e) => updateElement(selected.id, { capacity: Number(e.target.value) })}
              />
            </div>
          </>
        )}

        {isChairs && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="prop-rows">Filas</Label>
              <Input
                id="prop-rows"
                type="number"
                min={1}
                max={20}
                className="mt-1"
                value={selected.rows ?? 1}
                onChange={(e) => updateElement(selected.id, { rows: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="prop-columns">Columnas</Label>
              <Input
                id="prop-columns"
                type="number"
                min={1}
                max={20}
                className="mt-1"
                value={selected.columns ?? 1}
                onChange={(e) => updateElement(selected.id, { columns: Number(e.target.value) })}
              />
            </div>
          </div>
        )}

        {/* key: al cambiar de elemento se descarta el texto a medio escribir del anterior. */}
        <div key={selected.id} className="grid grid-cols-2 gap-2">
          <MetersInput
            id="prop-x"
            label="X (m)"
            px={selected.x}
            pxPerMeter={pxPerMeter}
            minPx={POSITION_MIN_PX}
            maxPx={POSITION_MAX_PX}
            allowNonPositive
            onChange={(x) => updateElement(selected.id, { x })}
          />
          <MetersInput
            id="prop-y"
            label="Y (m)"
            px={selected.y}
            pxPerMeter={pxPerMeter}
            minPx={POSITION_MIN_PX}
            maxPx={POSITION_MAX_PX}
            allowNonPositive
            onChange={(y) => updateElement(selected.id, { y })}
          />
          <MetersInput
            id="prop-width"
            label={selected.type === "table-round" ? "Diámetro (m)" : "Ancho (m)"}
            px={selected.width}
            pxPerMeter={pxPerMeter}
            minPx={ELEMENT_MIN_PX}
            maxPx={ELEMENT_MAX_PX}
            onChange={(width) =>
              updateElement(selected.id, { width, ...(selected.type === "table-round" ? { height: width } : {}) })
            }
          />
          <MetersInput
            id="prop-height"
            label="Alto (m)"
            px={selected.height}
            pxPerMeter={pxPerMeter}
            minPx={ELEMENT_MIN_PX}
            maxPx={ELEMENT_MAX_PX}
            disabled={selected.type === "table-round"}
            onChange={(height) => updateElement(selected.id, { height })}
          />
        </div>

        <div>
          <Label htmlFor="prop-rotation">Rotación (grados)</Label>
          <Input
            id="prop-rotation"
            type="number"
            className="mt-1"
            value={Math.round(selected.rotation)}
            onChange={(e) => updateElement(selected.id, { rotation: Number(e.target.value) })}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <ConfirmDeleteDialog
            triggerRender={<Button variant="destructive" size="sm" />}
            triggerChildren="Eliminar"
            title={`¿Eliminar "${selected.label || ELEMENT_LABELS[selected.type as ElementType]}"?`}
            description="Se quitará del plano de este salón."
            onConfirm={() => removeElement(selected.id)}
          />
          <Button variant="outline" size="sm" onClick={() => select(null)}>
            Deseleccionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Panel del modo "Editar salón": propiedades del elemento fijo seleccionado (pared, columna...). */
function FixturePropertiesPanel() {
  const roomFixtures = useCanvasStore((s) => s.roomFixtures);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const updateFixture = useCanvasStore((s) => s.updateFixture);
  const removeFixture = useCanvasStore((s) => s.removeFixture);
  const select = useCanvasStore((s) => s.select);
  const pxPerMeter = resolvePxPerMeter(useCanvasStore((s) => s.pxPerMeter));

  if (selectedIds.length > 1) return <MultiSelectionPanel count={selectedIds.length} />;
  const selected = roomFixtures.find((f) => f.id === selectedIds[0]);

  if (!selected) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Editando el salón. Agrega paredes, columnas, puertas o salidas desde la barra de abajo y
            selecciónalas para ajustar sus medidas. Las mesas de la boda quedan bloqueadas hasta terminar.
          </p>
        </CardContent>
      </Card>
    );
  }

  const type = selected.type as FixtureType;
  const isRound = type === "column-round";
  // Pared, puerta, ventana y salida son segmentos: el ancho es el largo y el alto, el grosor.
  const isSegment = type === "wall" || type === "door" || type === "window" || type === "emergency-exit";

  return (
    <Card>
      <CardContent className="space-y-3">
        <header>
          <p className="text-[10.5px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">Salón</p>
          <h3 className="font-heading text-xl font-semibold text-foreground italic">
            {selected.label || FIXTURE_LABELS[type]}
          </h3>
        </header>

        <div>
          <Label htmlFor="fixture-label">Etiqueta (opcional)</Label>
          <Input
            id="fixture-label"
            className="mt-1"
            maxLength={60}
            value={selected.label}
            onChange={(e) => updateFixture(selected.id, { label: e.target.value })}
          />
        </div>

        <div key={selected.id} className="grid grid-cols-2 gap-2">
          <MetersInput
            id="fixture-x"
            label="X (m)"
            px={selected.x}
            pxPerMeter={pxPerMeter}
            minPx={POSITION_MIN_PX}
            maxPx={POSITION_MAX_PX}
            allowNonPositive
            onChange={(x) => updateFixture(selected.id, { x })}
          />
          <MetersInput
            id="fixture-y"
            label="Y (m)"
            px={selected.y}
            pxPerMeter={pxPerMeter}
            minPx={POSITION_MIN_PX}
            maxPx={POSITION_MAX_PX}
            allowNonPositive
            onChange={(y) => updateFixture(selected.id, { y })}
          />
          <MetersInput
            id="fixture-width"
            label={isRound ? "Diámetro (m)" : isSegment ? "Largo (m)" : "Ancho (m)"}
            px={selected.width}
            pxPerMeter={pxPerMeter}
            minPx={FIXTURE_MIN_PX}
            maxPx={FIXTURE_MAX_PX}
            onChange={(width) => updateFixture(selected.id, { width, ...(isRound ? { height: width } : {}) })}
          />
          <MetersInput
            id="fixture-height"
            label={isSegment ? "Grosor (m)" : "Alto (m)"}
            px={selected.height}
            pxPerMeter={pxPerMeter}
            minPx={FIXTURE_MIN_PX}
            maxPx={FIXTURE_MAX_PX}
            disabled={isRound}
            onChange={(height) => updateFixture(selected.id, { height })}
          />
        </div>

        <div>
          <Label htmlFor="fixture-rotation">Rotación (grados)</Label>
          <Input
            id="fixture-rotation"
            type="number"
            className="mt-1"
            value={Math.round(selected.rotation)}
            onChange={(e) => updateFixture(selected.id, { rotation: Number(e.target.value) || 0 })}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="destructive" size="sm" onClick={() => removeFixture(selected.id)}>
            Eliminar
          </Button>
          <Button variant="outline" size="sm" onClick={() => select(null)}>
            Deseleccionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Varios elementos seleccionados: acciones en grupo (las mismas de la barra contextual). */
function MultiSelectionPanel({ count }: { count: number }) {
  const requestDeleteSelection = useCanvasStore((s) => s.requestDeleteSelection);
  const select = useCanvasStore((s) => s.select);
  const [matrixOpen, setMatrixOpen] = useState(false);

  return (
    <Card>
      <CardContent className="space-y-3">
        <header>
          <p className="text-[10.5px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">Selección</p>
          <h3 className="font-heading text-xl font-semibold text-foreground italic">{count} elementos</h3>
        </header>
        <p className="text-xs text-muted-foreground">
          Arrástralos juntos, muévelos con las flechas o usa las acciones de abajo. Shift + clic quita o agrega uno.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={duplicateOrWarn}>
            <Copy className="size-3.5" />
            Duplicar
          </Button>
          <Popover open={matrixOpen} onOpenChange={setMatrixOpen}>
            <PopoverTrigger render={<Button variant="outline" size="sm" />}>
              <Grid3x3 className="size-3.5" />
              Matriz
            </PopoverTrigger>
            <PopoverContent align="end">
              <MatrixForm onDone={() => setMatrixOpen(false)} />
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="col-span-2" />}>
              <AlignCenterVertical className="size-3.5" />
              Alinear y distribuir
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60">
              <AlignMenuItems count={count} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="destructive" size="sm" onClick={requestDeleteSelection}>
            <Trash2 className="size-3.5" />
            Eliminar {count}
          </Button>
          <Button variant="outline" size="sm" onClick={() => select(null)}>
            Deseleccionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
