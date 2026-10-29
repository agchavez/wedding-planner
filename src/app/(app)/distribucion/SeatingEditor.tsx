"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Layer, Line, Rect, Stage, Transformer } from "react-konva";
import type Konva from "konva";
import {
  AlertTriangle,
  ChevronDown,
  Loader2,
  Lock,
  LockOpen,
  Maximize,
  Redo2,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  snapContext,
  useCanvasStore,
  type Background,
  type SaveStatus,
} from "@/app/(app)/distribucion/canvasStore";
import { AmbienteControl } from "@/app/(app)/distribucion/AmbienteControl";
import { CanvasElement } from "@/app/(app)/distribucion/CanvasElement";
import { CanvasSizeControl } from "@/app/(app)/distribucion/CanvasSizeControl";
import { RoomShapeControl } from "@/app/(app)/distribucion/RoomShapeControl";
import { RoomShapeEditor } from "@/app/(app)/distribucion/RoomShapeEditor";
import { SnapGuidesLayer } from "@/app/(app)/distribucion/SnapGuidesLayer";
import { duplicateOrWarn, SelectionActionBar } from "@/app/(app)/distribucion/SelectionActionBar";
import { EditorDock } from "@/app/(app)/distribucion/Toolbar";
import { PropertiesPanel } from "@/app/(app)/distribucion/PropertiesPanel";
import { PlanThemeContext, usePlanPalette, usePlanPatterns } from "@/app/(app)/distribucion/planPalette";
import {
  cancelSelectionDrag,
  commitTransform,
  transformerHandleProps,
  useSelectionDrag,
} from "@/app/(app)/distribucion/useSelectionDrag";
import { useLayoutAutosave } from "@/app/(app)/distribucion/useLayoutAutosave";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWeddingAccess } from "@/components/WeddingAccess";
import { cn } from "@/lib/utils";
import { simplifyFreehandShape, type RoomPoint } from "@/lib/seatGeometry";
import { boxFromPoints, boxesIntersect, shapeBox } from "@/lib/layoutGeometry";
import { formatMeters, metersToPx, pickScaleBarMeters, resolvePxPerMeter } from "@/lib/layoutUnits";
import { isTableType } from "@/lib/seatGeometry";
import type { LayoutElement, RoomFixture } from "@/generated/prisma";

const ZOOM_STEP = 1.2;
const STAGE_VIEW_HEIGHT = "clamp(380px, 70vh, 680px)";
const MIN_ELEMENT_SIZE = 20;
// Mover con flechas: 5 cm por paso; con Shift, 50 cm.
const NUDGE_METERS = 0.05;
const NUDGE_METERS_LARGE = 0.5;
// Arrastre mínimo (en píxeles de pantalla) para que cuente como rectángulo de selección.
const MARQUEE_MIN_SCREEN_PX = 4;
const CORNER_ANCHORS = ["top-left", "top-right", "bottom-left", "bottom-right"];
const ALL_ANCHORS = [...CORNER_ANCHORS, "top-center", "bottom-center", "middle-left", "middle-right"];

function stageToWorld(stage: Konva.Stage, zoom: number, stageX: number, stageY: number): RoomPoint | null {
  const pointer = stage.getPointerPosition();
  if (!pointer) return null;
  return { x: (pointer.x - stageX) / zoom, y: (pointer.y - stageY) / zoom };
}

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Teclas que no deben robarle al usuario mientras escribe o navega un menú/diálogo. */
function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;
  return !!target.closest('[role="menu"], [role="dialog"], [role="listbox"], [role="alertdialog"]');
}

const INTERACTIVE_SELECTOR =
  'button, a[href], summary, [role="button"], [role="switch"], [role="tab"], [role="checkbox"], [role="radio"], [role="menuitem"], [role="slider"]';

/** Botones, pestañas, enlaces...: ahí Espacio activa el control y Supr/flechas no son del plano. */
function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && !!target.closest(INTERACTIVE_SELECTOR);
}

const isRoundType = (type: string) => type === "table-round" || type === "table-cake";

export function SeatingEditor({
  eventId,
  initialElements,
  canvasWidth: initialCanvasWidth,
  canvasHeight: initialCanvasHeight,
  initialBackground,
  initialRoomShape,
  initialRoomFixtures,
  pxPerMeter: initialPxPerMeter,
}: {
  eventId: string;
  initialElements: LayoutElement[];
  canvasWidth: number;
  canvasHeight: number;
  initialBackground: Background;
  initialRoomShape: RoomPoint[];
  initialRoomFixtures: RoomFixture[];
  pxPerMeter: number | null;
}) {
  const elements = useCanvasStore((s) => s.elements);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const dirty = useCanvasStore((s) => s.dirty);
  const saveStatus = useCanvasStore((s) => s.saveStatus);
  const canvasWidth = useCanvasStore((s) => s.canvasWidth);
  const canvasHeight = useCanvasStore((s) => s.canvasHeight);
  const background = useCanvasStore((s) => s.background);
  const roomShape = useCanvasStore((s) => s.roomShape);
  const pxPerMeterRaw = useCanvasStore((s) => s.pxPerMeter);
  const roomEditMode = useCanvasStore((s) => s.roomEditMode);
  const roomDrawMode = useCanvasStore((s) => s.roomDrawMode);
  const tool = useCanvasStore((s) => s.tool);
  const zoom = useCanvasStore((s) => s.zoom);
  const stageX = useCanvasStore((s) => s.stageX);
  const stageY = useCanvasStore((s) => s.stageY);
  const canUndo = useCanvasStore((s) => s.history.past.length > 0);
  const canRedo = useCanvasStore((s) => s.history.future.length > 0);
  const setElements = useCanvasStore((s) => s.setElements);
  const select = useCanvasStore((s) => s.select);
  const setSelection = useCanvasStore((s) => s.setSelection);
  const toggleRoomEditMode = useCanvasStore((s) => s.toggleRoomEditMode);
  const setView = useCanvasStore((s) => s.setView);
  const rotateRoomShape = useCanvasStore((s) => s.rotateRoomShape);
  const setRoomShapeFromPoints = useCanvasStore((s) => s.setRoomShapeFromPoints);
  const setViewCenter = useCanvasStore((s) => s.setViewCenter);
  const setInteracting = useCanvasStore((s) => s.setInteracting);
  const setTool = useCanvasStore((s) => s.setTool);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const { canEdit } = useWeddingAccess();

  const pxPerMeter = resolvePxPerMeter(pxPerMeterRaw);
  const palette = usePlanPalette();
  const patterns = usePlanPatterns(palette, background === "garden" ? palette.floorGarden : palette.floor);

  const nodeRefs = useRef(new Map<string, Konva.Group>());
  const transformerRef = useRef<Konva.Transformer>(null);
  const didInit = useRef(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const drawLineRef = useRef<Konva.Line>(null);
  const drawPointsRef = useRef<RoomPoint[]>([]);
  const isDrawingRef = useRef(false);
  const marqueeRef = useRef<Konva.Rect>(null);
  const marqueeStartRef = useRef<{ point: RoomPoint; additive: boolean } | null>(null);
  const pinchRef = useRef<{ dist: number; center: { x: number; y: number } } | null>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 560 });
  const [spaceDown, setSpaceDown] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  // Pantalla táctil: manijas del Transformer más grandes y el plano se mueve con un dedo.
  const [coarsePointer] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches);
  const drag = useSelectionDrag(nodeRefs);

  const didFitView = useRef(false);

  /** Encaja todo el lienzo en la zona visible. */
  const fitView = useCallback(
    (width: number, height: number, cw: number, ch: number) => {
      const fitZoom = clampZoom(Math.min(1, (width - 24) / cw, (height - 24) / ch));
      setView({ zoom: fitZoom, stageX: (width - cw * fitZoom) / 2, stageY: (height - ch * fitZoom) / 2 });
    },
    [setView]
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      setStageSize({ width, height });
      if (!didFitView.current) {
        didFitView.current = true;
        fitView(width, height, initialCanvasWidth, initialCanvasHeight);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    setElements(initialElements, {
      canvasWidth: initialCanvasWidth,
      canvasHeight: initialCanvasHeight,
      background: initialBackground,
      roomShape: initialRoomShape,
      roomFixtures: initialRoomFixtures,
      pxPerMeter: initialPxPerMeter,
    });
    // En pantallas táctiles, arrastrar con un dedo mueve el plano (la selección es con toques).
    if (coarsePointer) setTool("pan");
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
    const nodes = roomEditMode ? [] : selectedIds.map((id) => nodeRefs.current.get(id)).filter((n) => !!n);
    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedIds, elements, roomEditMode]);

  const performSave = useLayoutAutosave(eventId, canEdit);

  // Atajos de teclado (solo para quien puede editar).
  useEffect(() => {
    if (!canEdit) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || isTypingTarget(e.target)) return;
      const store = useCanvasStore.getState();
      if (store.pendingDelete) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      const hasSelection = store.selectedIds.length > 0;

      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
        return;
      } else if (mod && key === "y") {
        e.preventDefault();
        store.redo();
        return;
      } else if (mod && key === "d") {
        e.preventDefault();
        if (hasSelection) duplicateOrWarn();
        return;
      } else if (mod && key === "a") {
        e.preventDefault();
        store.selectAll();
        return;
      } else if (mod && key === "s") {
        e.preventDefault();
        performSave();
        return;
      } else if (e.key === "Escape") {
        if (store.roomDrawMode) store.setRoomDrawMode(false);
        store.select(null);
        return;
      }

      // Espacio: solo fuera de botones y demás controles (ahí lo usa el navegador para activarlos).
      const onControl = isInteractiveTarget(e.target);
      if (e.key === " ") {
        if (onControl || e.repeat) return;
        e.preventDefault();
        setSpaceDown(true);
        return;
      }
      // Supr, flechas y V/H/R: con el foco en el plano, en sus barras flotantes o en la página;
      // no con el foco en una pestaña, un enlace o un botón de fuera del plano.
      const inViewport = e.target instanceof Node && !!viewportRef.current?.contains(e.target);
      if (onControl && !inViewport) return;

      if ((e.key === "Delete" || e.key === "Backspace") && hasSelection) {
        e.preventDefault();
        store.requestDeleteSelection();
      } else if (e.key.startsWith("Arrow") && hasSelection && !mod) {
        e.preventDefault();
        const step = metersToPx(e.shiftKey ? NUDGE_METERS_LARGE : NUDGE_METERS, resolvePxPerMeter(store.pxPerMeter));
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        store.nudgeSelection(dx, dy);
      } else if (!mod && key === "v") {
        store.setTool("select");
      } else if (!mod && key === "h") {
        store.setTool("pan");
      } else if (!mod && key === "r" && hasSelection) {
        store.rotateSelection(e.shiftKey ? -15 : 15);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === " ") setSpaceDown(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [canEdit, performSave]);

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      const pointer = stage?.getPointerPosition();
      if (!stage || !pointer) return;

      const pointTo = { x: (pointer.x - stageX) / zoom, y: (pointer.y - stageY) / zoom };
      const nextZoom = clampZoom(e.evt.deltaY > 0 ? zoom / ZOOM_STEP : zoom * ZOOM_STEP);

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
      // Acerca/aleja respecto al centro de la zona visible.
      const center = { x: stageSize.width / 2, y: stageSize.height / 2 };
      const pointTo = { x: (center.x - stageX) / zoom, y: (center.y - stageY) / zoom };
      const nextZoom = clampZoom(zoom * factor);
      setView({ zoom: nextZoom, stageX: center.x - pointTo.x * nextZoom, stageY: center.y - pointTo.y * nextZoom });
    },
    [zoom, stageX, stageY, stageSize, setView]
  );

  const panning = !canEdit || tool === "pan" || spaceDown;

  const clearMarquee = useCallback(() => {
    marqueeStartRef.current = null;
    marqueeRef.current?.visible(false);
    marqueeRef.current?.getLayer()?.batchDraw();
  }, []);

  const handlePointerDown = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;
      if (roomDrawMode) {
        const point = stageToWorld(stage, zoom, stageX, stageY);
        if (point) {
          drawPointsRef.current = [point];
          isDrawingRef.current = true;
          drawLineRef.current?.points([point.x, point.y]);
          drawLineRef.current?.getLayer()?.batchDraw();
        }
        return;
      }
      if (e.target !== stage || panning || !e.evt.isPrimary) return;
      // Clic o arrastre en vacío con la herramienta de selección: rectángulo de selección.
      const point = stageToWorld(stage, zoom, stageX, stageY);
      if (point) marqueeStartRef.current = { point, additive: e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey };
    },
    [roomDrawMode, panning, zoom, stageX, stageY]
  );

  const handlePointerMove = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;
      if (roomDrawMode) {
        if (!isDrawingRef.current) return;
        const point = stageToWorld(stage, zoom, stageX, stageY);
        if (!point) return;
        drawPointsRef.current.push(point);
        drawLineRef.current?.points(drawPointsRef.current.flatMap((p) => [p.x, p.y]));
        drawLineRef.current?.getLayer()?.batchDraw();
        return;
      }
      const start = marqueeStartRef.current;
      const rect = marqueeRef.current;
      if (!start || !rect) return;
      const point = stageToWorld(stage, zoom, stageX, stageY);
      if (!point) return;
      const box = boxFromPoints(start.point, point);
      rect.setAttrs({ x: box.minX, y: box.minY, width: box.maxX - box.minX, height: box.maxY - box.minY, visible: true });
      rect.getLayer()?.batchDraw();
    },
    [roomDrawMode, zoom, stageX, stageY]
  );

  const handlePointerUp = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      if (roomDrawMode) {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        const raw = drawPointsRef.current;
        drawPointsRef.current = [];
        drawLineRef.current?.points([]);
        drawLineRef.current?.getLayer()?.batchDraw();
        if (raw.length >= 3) setRoomShapeFromPoints(simplifyFreehandShape(raw));
        return;
      }
      const start = marqueeStartRef.current;
      if (!start) return;
      const stage = e.target.getStage();
      const end = stage && stageToWorld(stage, zoom, stageX, stageY);
      clearMarquee();
      if (!end) return;
      const box = boxFromPoints(start.point, end);
      const tiny = Math.max(box.maxX - box.minX, box.maxY - box.minY) * zoom < MARQUEE_MIN_SCREEN_PX;
      if (tiny) {
        // Clic en vacío: suelta la selección (con Shift se conserva).
        if (!start.additive) select(null);
        return;
      }
      const { active } = snapContext(useCanvasStore.getState());
      const hits = active.filter((shape) => boxesIntersect(shapeBox(shape), box)).map((shape) => shape.id);
      setSelection(start.additive ? [...new Set([...useCanvasStore.getState().selectedIds, ...hits])] : hits);
    },
    [roomDrawMode, zoom, stageX, stageY, clearMarquee, select, setSelection, setRoomShapeFromPoints]
  );

  // Pellizco con dos dedos: zoom alrededor del punto medio (y arrastre del plano a la vez).
  const handleTouchMove = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;
      if (touches.length !== 2) return;
      e.evt.preventDefault();
      const stage = e.target.getStage();
      if (!stage) return;
      if (stage.isDragging()) stage.stopDrag();
      // Si el primer dedo había empezado a arrastrar una mesa, ese arrastre se descarta.
      cancelSelectionDrag(stage);
      clearMarquee();
      const rect = stage.container().getBoundingClientRect();
      const p1 = { x: touches[0].clientX - rect.left, y: touches[0].clientY - rect.top };
      const p2 = { x: touches[1].clientX - rect.left, y: touches[1].clientY - rect.top };
      const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const prev = pinchRef.current;
      pinchRef.current = { dist, center };
      if (!prev || prev.dist === 0) return;
      const view = useCanvasStore.getState();
      const pointTo = { x: (prev.center.x - view.stageX) / view.zoom, y: (prev.center.y - view.stageY) / view.zoom };
      const nextZoom = clampZoom(view.zoom * (dist / prev.dist));
      setView({ zoom: nextZoom, stageX: center.x - pointTo.x * nextZoom, stageY: center.y - pointTo.y * nextZoom });
    },
    [clearMarquee, setView]
  );

  const singleSelected = selectedIds.length === 1 ? elements.find((el) => el.id === selectedIds[0]) : undefined;
  const singleRound = !!singleSelected && isRoundType(singleSelected.type);
  const multi = selectedIds.length > 1;

  // Barra de escala: un largo "redondo" en metros según la escala del layout y el zoom actual.
  const screenPxPerMeter = pxPerMeter * zoom;
  const scaleBarMeters = pickScaleBarMeters(screenPxPerMeter);

  return (
    <div className={cn("grid min-w-0 grid-cols-1 gap-4", canEdit && "lg:grid-cols-[minmax(0,1fr)_18rem]")}>
      <div className="min-w-0 space-y-3">
        {canEdit && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <CanvasSizeControl />
              <AmbienteControl />
              <RoomShapeControl />
            </div>
            <div className="flex items-center gap-1">
              <SaveIndicator status={saveStatus} dirty={dirty} onSave={performSave} />
              <span className="mx-1 h-4 w-px bg-border" />
              <Button variant="outline" size="icon-sm" onClick={undo} disabled={!canUndo} title="Deshacer (Ctrl+Z)">
                <Undo2 className="size-3.5" />
                <span className="sr-only">Deshacer</span>
              </Button>
              <Button variant="outline" size="icon-sm" onClick={redo} disabled={!canRedo} title="Rehacer (Ctrl+Shift+Z)">
                <Redo2 className="size-3.5" />
                <span className="sr-only">Rehacer</span>
              </Button>
            </div>
          </div>
        )}

        <div
          ref={viewportRef}
          // Enfocable: al hacer clic en el plano, los atajos (Supr, flechas, Espacio) vuelven a ser del plano.
          tabIndex={canEdit ? 0 : undefined}
          aria-label="Plano del salón"
          className={cn(
            "plan-paper relative touch-none overflow-hidden rounded-xl border border-border select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            panning && "cursor-grab active:cursor-grabbing",
            roomDrawMode && "cursor-crosshair"
          )}
          style={{ height: STAGE_VIEW_HEIGHT }}
        >
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            scaleX={zoom}
            scaleY={zoom}
            x={stageX}
            y={stageY}
            draggable={!roomDrawMode && panning}
            onWheel={handleWheel}
            onDragStart={(e) => {
              if (e.target === e.target.getStage()) setInteracting(true);
            }}
            onDragEnd={(e) => {
              if (e.target !== e.target.getStage()) return;
              setInteracting(false);
              setView({ zoom, stageX: e.target.x(), stageY: e.target.y() });
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={(e) => {
              // Con la herramienta "mover", un toque o clic en vacío suelta la selección.
              if (panning && e.target === e.target.getStage()) select(null);
            }}
            onTap={(e) => {
              if (e.target === e.target.getStage()) select(null);
            }}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => {
              pinchRef.current = null;
            }}
          >
            <PlanThemeContext.Provider value={{ palette, patterns }}>
              <RoomShapeEditor panning={panning} coarsePointer={coarsePointer} />
              {/* Capa de la boda. En modo "Editar salón" se atenúa y deja pasar los clics a la capa salón. */}
              <Layer listening={!roomEditMode} opacity={roomEditMode ? 0.45 : 1}>
                {elements.map((el) => (
                  <CanvasElement
                    key={el.id}
                    element={el}
                    isSelected={canEdit && !roomEditMode && selectedIds.includes(el.id)}
                    editable={canEdit && !roomEditMode}
                    panning={panning}
                    pxPerMeter={pxPerMeter}
                    onSelect={select}
                    drag={drag}
                    registerRef={registerRef}
                  />
                ))}
                <Transformer
                  ref={transformerRef}
                  visible={canEdit}
                  rotateEnabled
                  rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
                  borderStroke={palette.accent}
                  borderDash={[4, 3]}
                  anchorStroke={palette.accent}
                  anchorFill={palette.table}
                  {...transformerHandleProps(coarsePointer)}
                  keepRatio={singleRound || multi}
                  enabledAnchors={singleRound || multi ? CORNER_ANCHORS : ALL_ANCHORS}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 20 || newBox.height < 20) return oldBox;
                    return newBox;
                  }}
                  onTransformStart={() => setInteracting(true)}
                  onTransformEnd={() => {
                    setInteracting(false);
                    const transformer = transformerRef.current;
                    if (!transformer) return;
                    commitTransform(
                      transformer,
                      (id) => {
                        const el = useCanvasStore.getState().elements.find((x) => x.id === id);
                        return el && { width: el.width, height: el.height, round: isRoundType(el.type) };
                      },
                      MIN_ELEMENT_SIZE
                    );
                  }}
                />
              </Layer>
              <Layer listening={false}>
                {roomDrawMode && (
                  <Line ref={drawLineRef} points={[]} stroke={palette.accent} strokeWidth={2 / zoom} dash={[6, 4]} lineCap="round" lineJoin="round" />
                )}
                <Rect
                  ref={marqueeRef}
                  visible={false}
                  fill={palette.accent}
                  opacity={0.12}
                  stroke={palette.accent}
                  strokeWidth={1 / zoom}
                  strokeScaleEnabled={false}
                />
              </Layer>
              <SnapGuidesLayer />
            </PlanThemeContext.Provider>
          </Stage>

          {/* Capa salón (bloqueada) + ayuda del modo actual. */}
          <div className="pointer-events-none absolute top-2 left-2 flex max-w-[calc(100%-9rem)] flex-wrap items-center gap-1.5">
            {canEdit ? (
              <button
                type="button"
                onClick={toggleRoomEditMode}
                className={cn(
                  "pointer-events-auto flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium shadow-sm transition-colors",
                  roomEditMode
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card/95 text-foreground hover:border-primary"
                )}
                title={roomEditMode ? "Terminar de editar el salón" : "Desbloquear para editar paredes, columnas y puertas"}
              >
                {roomEditMode ? <LockOpen className="size-3.5" /> : <Lock className="size-3.5" />}
                {roomEditMode ? "Editando salón · Terminar" : "Salón (bloqueado)"}
              </button>
            ) : (
              <span className="flex items-center gap-1.5 rounded-lg border border-border bg-card/95 px-2.5 py-1 text-xs text-muted-foreground">
                <Lock className="size-3.5" />
                Solo lectura
              </span>
            )}
            {roomEditMode && (
              <>
                <button
                  type="button"
                  onClick={() => rotateRoomShape(-15)}
                  className="pointer-events-auto grid size-7 place-items-center rounded-lg border border-border bg-card/95 shadow-sm"
                  title="Rotar contorno a la izquierda"
                >
                  <RotateCcw className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => rotateRoomShape(15)}
                  className="pointer-events-auto grid size-7 place-items-center rounded-lg border border-border bg-card/95 shadow-sm"
                  title="Rotar contorno a la derecha"
                >
                  <RotateCw className="size-3.5" />
                </button>
                <span className="hidden rounded-lg bg-card/90 px-2 py-1 text-[11px] text-muted-foreground md:inline">
                  {roomShape.length < 3 && "Sin contorno: elige una forma en «Forma del local» · "}
                  Arrastra los vértices · + en un borde agrega una esquina · clic derecho (o doble toque) quita un vértice
                </span>
              </>
            )}
            {roomDrawMode && (
              <span className="rounded-lg bg-card/90 px-2 py-1 text-[11px] text-muted-foreground">
                Dibuja el contorno del local (presiona, arrastra y suelta). Esc para cancelar.
              </span>
            )}
          </div>

          {/* Zoom */}
          <div className="absolute top-2 right-2 flex items-center gap-0.5 rounded-lg border border-border bg-card/95 p-0.5 shadow-sm">
            <button type="button" className="grid size-7 place-items-center rounded-md hover:bg-muted" onClick={() => zoomBy(1 / ZOOM_STEP)}>
              <ZoomOut className="size-3.5" />
              <span className="sr-only">Alejar</span>
            </button>
            <span className="w-11 text-center text-xs text-muted-foreground tabular-nums">{Math.round(zoom * 100)}%</span>
            <button type="button" className="grid size-7 place-items-center rounded-md hover:bg-muted" onClick={() => zoomBy(ZOOM_STEP)}>
              <ZoomIn className="size-3.5" />
              <span className="sr-only">Acercar</span>
            </button>
            <button
              type="button"
              className="grid size-7 place-items-center rounded-md hover:bg-muted"
              onClick={() => fitView(stageSize.width, stageSize.height, canvasWidth, canvasHeight)}
              title="Ver todo el salón"
            >
              <Maximize className="size-3.5" />
              <span className="sr-only">Ver todo el salón</span>
            </button>
          </div>

          <div className="pointer-events-none absolute bottom-3 left-3 hidden rounded-md bg-card/85 px-2 py-1 text-[11px] text-muted-foreground shadow-sm sm:block">
            <div className="h-1.5 border-x-2 border-b-2 border-foreground/60" style={{ width: scaleBarMeters * screenPxPerMeter }} />
            <span className="tabular-nums">{formatMeters(scaleBarMeters, scaleBarMeters < 1 ? 1 : 0)}</span>
          </div>

          {canEdit && <SelectionActionBar viewportWidth={stageSize.width} coarsePointer={coarsePointer} />}

          {canEdit && (
            <div className="pointer-events-none absolute inset-x-2 bottom-3 flex justify-center">
              <EditorDock />
            </div>
          )}
        </div>
      </div>

      {canEdit && <DeleteSelectionDialog />}

      {canEdit && (
        <div className="min-w-0">
          {/* En pantallas chicas el panel va debajo del plano y se puede plegar. */}
          <button
            type="button"
            className="mb-2 flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium lg:hidden"
            onClick={() => setPanelOpen((open) => !open)}
            aria-expanded={panelOpen}
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="size-4" />
              Propiedades
              {selectedIds.length > 0 && <span className="text-xs text-muted-foreground">({selectedIds.length})</span>}
            </span>
            <ChevronDown className={cn("size-4 transition-transform", panelOpen && "rotate-180")} />
          </button>
          <div className={cn(!panelOpen && "hidden", "lg:block")}>
            <PropertiesPanel />
          </div>
        </div>
      )}
    </div>
  );
}

/** Confirmación al borrar mesas (pueden tener invitados) o varios elementos a la vez. */
function DeleteSelectionDialog() {
  const pendingDelete = useCanvasStore((s) => s.pendingDelete);
  const summary = useCanvasStore(
    useShallow((s) => {
      const ids = new Set(s.selectedIds);
      const items: { type: string }[] = (s.roomEditMode ? s.roomFixtures : s.elements).filter((item) => ids.has(item.id));
      return { count: items.length, tables: s.roomEditMode ? 0 : items.filter((item) => isTableType(item.type)).length };
    })
  );
  const deleteSelection = useCanvasStore((s) => s.deleteSelection);
  const cancelDeleteRequest = useCanvasStore((s) => s.cancelDeleteRequest);
  const { count, tables } = summary;

  return (
    <AlertDialog open={pendingDelete} onOpenChange={(open) => !open && cancelDeleteRequest()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {count === 1 ? "¿Eliminar este elemento?" : `¿Eliminar ${count} elementos?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {tables > 0
              ? `Incluye ${tables === 1 ? "una mesa" : `${tables} mesas`}: los invitados sentados ahí dejarán de verse en el plano. `
              : ""}
            Puedes deshacerlo con Ctrl+Z mientras sigas en esta página.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant="outline" />}>Cancelar</AlertDialogCancel>
          <AlertDialogAction render={<Button variant="destructive" />} onClick={deleteSelection}>
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SaveIndicator({ status, dirty, onSave }: { status: SaveStatus; dirty: boolean; onSave: () => void }) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Guardando…
      </span>
    );
  }
  if (status === "error") {
    return (
      <button
        type="button"
        onClick={onSave}
        className="flex items-center gap-1.5 rounded-md px-1 text-xs font-medium text-destructive hover:underline"
        title="Volver a intentar el guardado"
      >
        <AlertTriangle className="size-3.5" />
        No se pudo guardar · Reintentar
      </button>
    );
  }
  if (dirty) {
    return (
      <button
        type="button"
        onClick={onSave}
        className="flex items-center gap-1.5 rounded-md px-1 text-xs text-muted-foreground hover:text-foreground"
        title="Guardar ahora (Ctrl+S)"
      >
        <span className="size-2 rounded-full bg-amber-500" />
        Cambios sin guardar
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
      <span className="size-2 rounded-full bg-emerald-600" />
      Guardado
    </span>
  );
}
