"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Layer, Line, Stage, Transformer } from "react-konva";
import type Konva from "konva";
import { Maximize, RotateCcw, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { MAX_ZOOM, MIN_ZOOM, useCanvasStore, type Background } from "@/app/(app)/distribucion/canvasStore";
import { AmbienteControl } from "@/app/(app)/distribucion/AmbienteControl";
import { CanvasElement } from "@/app/(app)/distribucion/CanvasElement";
import { CanvasSizeControl } from "@/app/(app)/distribucion/CanvasSizeControl";
import { RoomShapeControl } from "@/app/(app)/distribucion/RoomShapeControl";
import { RoomShapeEditor } from "@/app/(app)/distribucion/RoomShapeEditor";
import { Toolbar } from "@/app/(app)/distribucion/Toolbar";
import { PropertiesPanel } from "@/app/(app)/distribucion/PropertiesPanel";
import { saveLayout } from "@/app/(app)/distribucion/actions";
import { Button } from "@/components/ui/button";
import { useWeddingAccess } from "@/components/WeddingAccess";
import { cn } from "@/lib/utils";
import { simplifyFreehandShape, type RoomPoint } from "@/lib/seatGeometry";
import type { LayoutElement } from "@/generated/prisma";

const AUTOSAVE_DELAY_MS = 800;
const ZOOM_STEP = 1.2;
const STAGE_VIEW_HEIGHT = "min(70vh, 560px)";

function stageToWorld(stage: Konva.Stage, zoom: number, stageX: number, stageY: number): RoomPoint | null {
  const pointer = stage.getPointerPosition();
  if (!pointer) return null;
  return { x: (pointer.x - stageX) / zoom, y: (pointer.y - stageY) / zoom };
}

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
  initialRoomShape,
}: {
  eventId: string;
  initialElements: LayoutElement[];
  canvasWidth: number;
  canvasHeight: number;
  initialBackground: Background;
  initialRoomShape: RoomPoint[];
}) {
  const elements = useCanvasStore((s) => s.elements);
  const selectedId = useCanvasStore((s) => s.selectedId);
  const dirty = useCanvasStore((s) => s.dirty);
  const saveStatus = useCanvasStore((s) => s.saveStatus);
  const canvasWidth = useCanvasStore((s) => s.canvasWidth);
  const canvasHeight = useCanvasStore((s) => s.canvasHeight);
  const background = useCanvasStore((s) => s.background);
  const roomShape = useCanvasStore((s) => s.roomShape);
  const roomEditMode = useCanvasStore((s) => s.roomEditMode);
  const roomDrawMode = useCanvasStore((s) => s.roomDrawMode);
  const zoom = useCanvasStore((s) => s.zoom);
  const stageX = useCanvasStore((s) => s.stageX);
  const stageY = useCanvasStore((s) => s.stageY);
  const setElements = useCanvasStore((s) => s.setElements);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const selectElement = useCanvasStore((s) => s.selectElement);
  const setSaveStatus = useCanvasStore((s) => s.setSaveStatus);
  const markClean = useCanvasStore((s) => s.markClean);
  const setView = useCanvasStore((s) => s.setView);
  const resetView = useCanvasStore((s) => s.resetView);
  const rotateRoomShape = useCanvasStore((s) => s.rotateRoomShape);
  const setRoomShapeFromPoints = useCanvasStore((s) => s.setRoomShapeFromPoints);
  const setViewCenter = useCanvasStore((s) => s.setViewCenter);
  const { canEdit } = useWeddingAccess();

  const nodeRefs = useRef(new Map<string, Konva.Group>());
  const transformerRef = useRef<Konva.Transformer>(null);
  const didInit = useRef(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const drawLineRef = useRef<Konva.Line>(null);
  const drawPointsRef = useRef<RoomPoint[]>([]);
  const isDrawingRef = useRef(false);
  const [stageSize, setStageSize] = useState({ width: 800, height: 560 });

  const didFitView = useRef(false);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      setStageSize({ width, height });
      if (!didFitView.current) {
        didFitView.current = true;
        const fitZoom = Math.min(1, width / initialCanvasWidth, height / initialCanvasHeight);
        setView({
          zoom: fitZoom,
          stageX: (width - initialCanvasWidth * fitZoom) / 2,
          stageY: (height - initialCanvasHeight * fitZoom) / 2,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    setElements(initialElements, initialCanvasWidth, initialCanvasHeight, initialBackground, initialRoomShape);
    // Solo se usa el valor inicial cargado del servidor; después el store es la fuente de verdad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Centro de la zona visible, en coordenadas del lienzo: ahí aparecen los elementos nuevos.
  useEffect(() => {
    setViewCenter({ x: (stageSize.width / 2 - stageX) / zoom, y: (stageSize.height / 2 - stageY) / zoom });
  }, [stageSize, zoom, stageX, stageY, setViewCenter]);

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
    await saveLayout(eventId, elements, canvasWidth, canvasHeight, background, roomShape);
    markClean();
  }, [eventId, elements, canvasWidth, canvasHeight, background, roomShape, setSaveStatus, markClean]);

  useEffect(() => {
    if (!dirty) return;
    const timeout = setTimeout(() => {
      performSave();
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, elements, canvasWidth, canvasHeight, background, roomShape]);

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      const pointer = stage?.getPointerPosition();
      if (!stage || !pointer) return;

      const pointTo = { x: (pointer.x - stageX) / zoom, y: (pointer.y - stageY) / zoom };
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, e.evt.deltaY > 0 ? zoom / ZOOM_STEP : zoom * ZOOM_STEP));

      setView({
        zoom: nextZoom,
        stageX: pointer.x - pointTo.x * nextZoom,
        stageY: pointer.y - pointTo.y * nextZoom,
      });
    },
    [zoom, stageX, stageY, setView]
  );

  const zoomBy = useCallback(
    (factor: number) => {
      setView({
        zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor)),
        stageX,
        stageY,
      });
    },
    [zoom, stageX, stageY, setView]
  );

  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (roomDrawMode) {
        const stage = e.target.getStage();
        const point = stage && stageToWorld(stage, zoom, stageX, stageY);
        if (point) {
          drawPointsRef.current = [point];
          isDrawingRef.current = true;
          drawLineRef.current?.points([point.x, point.y]);
          drawLineRef.current?.getLayer()?.batchDraw();
        }
        return;
      }
      if (e.target === e.target.getStage()) selectElement(null);
    },
    [roomDrawMode, zoom, stageX, stageY, selectElement]
  );

  const handleStageMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!roomDrawMode || !isDrawingRef.current) return;
      const stage = e.target.getStage();
      const point = stage && stageToWorld(stage, zoom, stageX, stageY);
      if (!point) return;
      drawPointsRef.current.push(point);
      drawLineRef.current?.points(drawPointsRef.current.flatMap((p) => [p.x, p.y]));
      drawLineRef.current?.getLayer()?.batchDraw();
    },
    [roomDrawMode, zoom, stageX, stageY]
  );

  const handleStageMouseUp = useCallback(() => {
    if (!roomDrawMode || !isDrawingRef.current) return;
    isDrawingRef.current = false;
    const raw = drawPointsRef.current;
    drawPointsRef.current = [];
    drawLineRef.current?.points([]);
    drawLineRef.current?.getLayer()?.batchDraw();
    if (raw.length >= 3) setRoomShapeFromPoints(simplifyFreehandShape(raw));
  }, [roomDrawMode, setRoomShapeFromPoints]);

  const selected = elements.find((el) => el.id === selectedId);
  const isRoundSelected = selected?.type === "table-round";

  return (
    <div className={cn("grid min-w-0 grid-cols-1 gap-4", canEdit && "lg:grid-cols-[minmax(0,1fr)_18rem]")}>
      <div className="min-w-0 space-y-3">
        {canEdit && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Toolbar />
              <CanvasSizeControl />
              <AmbienteControl />
              <RoomShapeControl />
            </div>
            <div className="flex items-center gap-3">
              <SaveIndicator status={saveStatus} dirty={dirty} />
              <Button onClick={performSave}>Guardar ahora</Button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => zoomBy(1 / ZOOM_STEP)}>
            <ZoomOut className="size-3.5" />
            <span className="sr-only">Alejar</span>
          </Button>
          <span className="w-12 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="icon-sm" onClick={() => zoomBy(ZOOM_STEP)}>
            <ZoomIn className="size-3.5" />
            <span className="sr-only">Acercar</span>
          </Button>
          <Button variant="outline" size="icon-sm" onClick={resetView}>
            <Maximize className="size-3.5" />
            <span className="sr-only">Restablecer vista</span>
          </Button>
          {roomEditMode && (
            <>
              <span className="mx-1 h-4 w-px bg-border" />
              <Button variant="outline" size="icon-sm" onClick={() => rotateRoomShape(-15)}>
                <RotateCcw className="size-3.5" />
                <span className="sr-only">Rotar forma a la izquierda</span>
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => rotateRoomShape(15)}>
                <RotateCw className="size-3.5" />
                <span className="sr-only">Rotar forma a la derecha</span>
              </Button>
              <span className="ml-2 text-xs text-muted-foreground">
                Arrastra los vértices · clic en el + de un borde para agregar una esquina · clic derecho en un vértice
                para quitarlo · rota con los botones
              </span>
            </>
          )}
          {roomDrawMode && (
            <span className="ml-2 text-xs text-muted-foreground">
              Dibuja el contorno del local con el mouse (clic, arrastra y suelta) — se convertirá en una forma editable.
            </span>
          )}
        </div>

        <div
          ref={viewportRef}
          className={cn("overflow-hidden rounded-lg border border-border", BACKGROUND_CLASSES[background])}
          style={{ height: STAGE_VIEW_HEIGHT }}
        >
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            scaleX={zoom}
            scaleY={zoom}
            x={stageX}
            y={stageY}
            draggable={!roomDrawMode}
            onWheel={handleWheel}
            onDragEnd={(e) => {
              if (e.target === e.target.getStage()) setView({ zoom, stageX: e.target.x(), stageY: e.target.y() });
            }}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
          >
            <RoomShapeEditor />
            <Layer>
              {elements.map((el) => (
                <CanvasElement
                  key={el.id}
                  element={el}
                  isSelected={canEdit && el.id === selectedId}
                  editable={canEdit}
                  onSelect={selectElement}
                  onChange={updateElement}
                  registerRef={registerRef}
                />
              ))}
              <Transformer
                ref={transformerRef}
                visible={canEdit}
                rotateEnabled
                keepRatio={isRoundSelected}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 20 || newBox.height < 20) return oldBox;
                  return newBox;
                }}
              />
            </Layer>
            {roomDrawMode && (
              <Layer listening={false}>
                <Line ref={drawLineRef} points={[]} stroke="#a8415c" strokeWidth={2} dash={[6, 4]} lineCap="round" lineJoin="round" />
              </Layer>
            )}
          </Stage>
        </div>
      </div>

      {canEdit && <PropertiesPanel />}
    </div>
  );
}

function SaveIndicator({ status, dirty }: { status: "idle" | "saving" | "saved"; dirty: boolean }) {
  if (status === "saving") return <span className="text-sm text-muted-foreground">Guardando…</span>;
  if (dirty) return <span className="text-sm text-amber-600">Cambios sin guardar…</span>;
  if (status === "saved") return <span className="text-sm text-emerald-600">Guardado ✓</span>;
  return null;
}
