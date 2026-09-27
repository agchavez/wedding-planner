"use client";

import { useCallback, useEffect, useRef } from "react";
import { Layer, Stage, Transformer } from "react-konva";
import type Konva from "konva";
import { useCanvasStore, type Background } from "@/app/(app)/distribucion/canvasStore";
import { AmbienteControl } from "@/app/(app)/distribucion/AmbienteControl";
import { CanvasElement } from "@/app/(app)/distribucion/CanvasElement";
import { CanvasSizeControl } from "@/app/(app)/distribucion/CanvasSizeControl";
import { Toolbar } from "@/app/(app)/distribucion/Toolbar";
import { PropertiesPanel } from "@/app/(app)/distribucion/PropertiesPanel";
import { saveLayout } from "@/app/(app)/distribucion/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LayoutElement } from "@/generated/prisma";

const AUTOSAVE_DELAY_MS = 800;

const BACKGROUND_CLASSES: Record<Background, string> = {
  indoor: "bg-muted",
  garden: "bg-[#e4ecd8]",
};

export function SeatingEditor({
  eventId,
  initialElements,
  canvasWidth: initialCanvasWidth,
  canvasHeight: initialCanvasHeight,
  initialBackground,
}: {
  eventId: string;
  initialElements: LayoutElement[];
  canvasWidth: number;
  canvasHeight: number;
  initialBackground: Background;
}) {
  const elements = useCanvasStore((s) => s.elements);
  const selectedId = useCanvasStore((s) => s.selectedId);
  const dirty = useCanvasStore((s) => s.dirty);
  const saveStatus = useCanvasStore((s) => s.saveStatus);
  const canvasWidth = useCanvasStore((s) => s.canvasWidth);
  const canvasHeight = useCanvasStore((s) => s.canvasHeight);
  const background = useCanvasStore((s) => s.background);
  const setElements = useCanvasStore((s) => s.setElements);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const selectElement = useCanvasStore((s) => s.selectElement);
  const setSaveStatus = useCanvasStore((s) => s.setSaveStatus);
  const markClean = useCanvasStore((s) => s.markClean);

  const nodeRefs = useRef(new Map<string, Konva.Group>());
  const transformerRef = useRef<Konva.Transformer>(null);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    setElements(initialElements, initialCanvasWidth, initialCanvasHeight, initialBackground);
    // Solo se usa el valor inicial cargado del servidor; después el store es la fuente de verdad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registerRef = useCallback((id: string, node: Konva.Group | null) => {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  }, []);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const node = selectedId ? nodeRefs.current.get(selectedId) : null;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, elements]);

  const performSave = useCallback(async () => {
    setSaveStatus("saving");
    await saveLayout(eventId, elements, canvasWidth, canvasHeight, background);
    markClean();
  }, [eventId, elements, canvasWidth, canvasHeight, background, setSaveStatus, markClean]);

  useEffect(() => {
    if (!dirty) return;
    const timeout = setTimeout(() => {
      performSave();
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, elements, canvasWidth, canvasHeight, background]);

  const selected = elements.find((el) => el.id === selectedId);
  const isRoundSelected = selected?.type === "table-round";

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Toolbar />
            <CanvasSizeControl />
            <AmbienteControl />
          </div>
          <div className="flex items-center gap-3">
            <SaveIndicator status={saveStatus} dirty={dirty} />
            <Button onClick={performSave}>Guardar ahora</Button>
          </div>
        </div>

        <div
          className={cn("overflow-auto rounded-lg border border-border", BACKGROUND_CLASSES[background])}
          style={{ maxHeight: "min(70vh, 560px)" }}
        >
          <Stage
            width={canvasWidth}
            height={canvasHeight}
            onMouseDown={(e) => {
              if (e.target === e.target.getStage()) selectElement(null);
            }}
          >
            <Layer>
              {elements.map((el) => (
                <CanvasElement
                  key={el.id}
                  element={el}
                  isSelected={el.id === selectedId}
                  onSelect={selectElement}
                  onChange={updateElement}
                  registerRef={registerRef}
                />
              ))}
              <Transformer
                ref={transformerRef}
                rotateEnabled
                keepRatio={isRoundSelected}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 20 || newBox.height < 20) return oldBox;
                  return newBox;
                }}
              />
            </Layer>
          </Stage>
        </div>
      </div>

      <PropertiesPanel />
    </div>
  );
}

function SaveIndicator({ status, dirty }: { status: "idle" | "saving" | "saved"; dirty: boolean }) {
  if (status === "saving") return <span className="text-sm text-muted-foreground">Guardando…</span>;
  if (dirty) return <span className="text-sm text-amber-600">Cambios sin guardar…</span>;
  if (status === "saved") return <span className="text-sm text-emerald-600">Guardado ✓</span>;
  return null;
}
