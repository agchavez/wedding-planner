"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Circle, Image as KonvaImage, Layer, Line, Rect, Text, Transformer } from "react-konva";
import type Konva from "konva";
import { useCanvasStore } from "@/app/(app)/distribucion/canvasStore";
import { usePlanTheme } from "@/app/(app)/distribucion/planPalette";
import { commitTransform, transformerHandleProps, useSelectionDrag } from "@/app/(app)/distribucion/useSelectionDrag";
import { RoomFixtureShape } from "@/app/(app)/distribucion/shapes/RoomFixtureShape";
import { formatMeters, metersToPx, pxToMeters, resolvePxPerMeter } from "@/lib/layoutUnits";
import type { RoomPoint } from "@/lib/seatGeometry";
import { isAllowedPlanUrl } from "@/lib/venueLibrary";

const VERTEX_RADIUS = 7;
const MIDPOINT_RADIUS = 6;
const EDGE_LABEL_WIDTH = 90;
// Grosor de las paredes del contorno (nogal), en metros.
const WALL_THICKNESS_METERS = 0.2;
const MIN_FIXTURE_SIZE = 2;
const CORNER_ANCHORS = ["top-left", "top-right", "bottom-left", "bottom-right"];
const ALL_ANCHORS = [...CORNER_ANCHORS, "top-center", "bottom-center", "middle-left", "middle-right"];

function toFlatPoints(points: RoomPoint[]): number[] {
  return points.flatMap((p) => [p.x, p.y]);
}

/** Imagen cargada para Konva (null mientras carga o si falla). */
function useHtmlImage(url: string | undefined) {
  const [loaded, setLoaded] = useState<{ url: string; image: HTMLImageElement } | null>(null);
  useEffect(() => {
    if (!url) return;
    const image = new window.Image();
    image.onload = () => setLoaded({ url, image });
    image.src = url;
    return () => {
      image.onload = null;
    };
  }, [url]);
  return loaded && loaded.url === url ? loaded.image : null;
}

/**
 * Capa salón: piso de lino, contorno del local con paredes gruesas y elementos fijos (paredes,
 * columnas, puertas...). Se dibuja debajo de los elementos de la boda y está bloqueada (no
 * escucha eventos) salvo en el modo "Editar salón", donde se arrastran vértices y elementos
 * fijos (también varios a la vez) y se ven las medidas de cada borde.
 */
export function RoomShapeEditor({ panning = false, coarsePointer = false }: { panning?: boolean; coarsePointer?: boolean }) {
  const roomShape = useCanvasStore((s) => s.roomShape);
  const roomFixtures = useCanvasStore((s) => s.roomFixtures);
  const backgroundImage = useCanvasStore((s) => s.backgroundImage);
  // Solo planos subidos a la app (nunca se pide la imagen a un host externo).
  const planImage = useHtmlImage(isAllowedPlanUrl(backgroundImage?.url) ? backgroundImage?.url : undefined);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const roomEditMode = useCanvasStore((s) => s.roomEditMode);
  const canvasWidth = useCanvasStore((s) => s.canvasWidth);
  const canvasHeight = useCanvasStore((s) => s.canvasHeight);
  const zoom = useCanvasStore((s) => s.zoom);
  const pxPerMeter = resolvePxPerMeter(useCanvasStore((s) => s.pxPerMeter));
  const updateRoomPoint = useCanvasStore((s) => s.updateRoomPoint);
  const addRoomPoint = useCanvasStore((s) => s.addRoomPoint);
  const removeRoomPoint = useCanvasStore((s) => s.removeRoomPoint);
  const breakHistoryGroup = useCanvasStore((s) => s.breakHistoryGroup);
  const select = useCanvasStore((s) => s.select);
  const { palette, patterns } = usePlanTheme();

  const nodeRefs = useRef(new Map<string, Konva.Group>());
  const transformerRef = useRef<Konva.Transformer>(null);
  const drag = useSelectionDrag(nodeRefs);

  const registerRef = useCallback((id: string, node: Konva.Group | null) => {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  }, []);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const nodes = roomEditMode ? selectedIds.map((id) => nodeRefs.current.get(id)).filter((n) => !!n) : [];
    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedIds, roomFixtures, roomEditMode]);

  const hasShape = roomShape.length >= 3;
  const selectedSet = new Set(roomEditMode ? selectedIds : []);
  const single = selectedIds.length === 1 ? roomFixtures.find((f) => f.id === selectedIds[0]) : undefined;
  const singleRound = single?.type === "column-round";
  // Texto de las medidas a tamaño constante en pantalla, sin importar el zoom.
  const labelSize = 12 / zoom;
  const linen = patterns.linen as unknown as HTMLImageElement | null;

  return (
    <Layer listening={roomEditMode}>
      {hasShape ? (
        <Line
          points={toFlatPoints(roomShape)}
          closed
          fill={linen ? undefined : palette.floor}
          fillPatternImage={linen ?? undefined}
          fillPatternRepeat="repeat"
          // Con plano de fondo las paredes se dibujan encima de la imagen (ver más abajo).
          stroke={planImage ? undefined : palette.wall}
          strokeWidth={metersToPx(WALL_THICKNESS_METERS, pxPerMeter)}
          lineJoin="miter"
          listening={false}
        />
      ) : (
        // Sin contorno: el área del lienzo hace de piso, con un borde fino (no sabemos dónde hay paredes).
        <Rect
          width={canvasWidth}
          height={canvasHeight}
          fill={linen ? undefined : palette.floor}
          fillPatternImage={linen ?? undefined}
          fillPatternRepeat="repeat"
          stroke={palette.zoneLine}
          strokeWidth={1}
          listening={false}
        />
      )}
      {/* Plano importado: encima del piso y debajo de paredes y elementos fijos, para calcarlo. */}
      {backgroundImage && planImage && (
        <KonvaImage
          image={planImage}
          x={backgroundImage.x}
          y={backgroundImage.y}
          width={backgroundImage.width}
          height={backgroundImage.height}
          opacity={backgroundImage.opacity}
          listening={false}
        />
      )}
      {hasShape && planImage && (
        <Line
          points={toFlatPoints(roomShape)}
          closed
          stroke={palette.wall}
          strokeWidth={metersToPx(WALL_THICKNESS_METERS, pxPerMeter)}
          lineJoin="miter"
          listening={false}
        />
      )}
      {roomEditMode && hasShape && (
        <Line points={toFlatPoints(roomShape)} closed stroke={palette.accent} strokeWidth={1.5 / zoom} dash={[8 / zoom, 5 / zoom]} listening={false} />
      )}
      {roomFixtures.map((fixture) => (
        <RoomFixtureShape
          key={fixture.id}
          fixture={fixture}
          editable={roomEditMode}
          panning={panning}
          isSelected={selectedSet.has(fixture.id)}
          onSelect={select}
          drag={drag}
          registerRef={registerRef}
        />
      ))}
      {roomEditMode &&
        hasShape &&
        roomShape.map((point, i) => {
          const next = roomShape[(i + 1) % roomShape.length];
          const mid = { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 };
          const length = Math.hypot(next.x - point.x, next.y - point.y);
          // Normal del borde para dejar la medida a un lado del "+".
          const normal = length > 0 ? { x: -(next.y - point.y) / length, y: (next.x - point.x) / length } : { x: 0, y: -1 };
          const labelOffset = 18 / zoom;
          return (
            <Fragment key={i}>
              <Text
                x={mid.x + normal.x * labelOffset - EDGE_LABEL_WIDTH / zoom / 2}
                y={mid.y + normal.y * labelOffset - labelSize / 2}
                width={EDGE_LABEL_WIDTH / zoom}
                align="center"
                text={formatMeters(pxToMeters(length, pxPerMeter))}
                fontSize={labelSize}
                fontFamily={palette.bodyFont}
                fill={palette.accent}
                listening={false}
              />
              <Circle
                x={mid.x}
                y={mid.y}
                radius={MIDPOINT_RADIUS / zoom}
                fill={palette.table}
                stroke={palette.accent}
                strokeWidth={1.5 / zoom}
                opacity={0.8}
                onClick={() => addRoomPoint(i)}
                onTap={() => addRoomPoint(i)}
              />
              <Text
                x={mid.x - 4 / zoom}
                y={mid.y - 5.5 / zoom}
                text="+"
                fontSize={11 / zoom}
                fill={palette.accent}
                listening={false}
              />
              <Circle
                x={point.x}
                y={point.y}
                radius={VERTEX_RADIUS / zoom}
                fill={palette.table}
                stroke={palette.accent}
                strokeWidth={2 / zoom}
                draggable={!panning}
                // Cada arrastre de un vértice es un paso propio del historial.
                onDragStart={breakHistoryGroup}
                onDragMove={(e: Konva.KonvaEventObject<DragEvent>) =>
                  updateRoomPoint(i, { x: e.target.x(), y: e.target.y() })
                }
                onContextMenu={(e: Konva.KonvaEventObject<MouseEvent>) => {
                  e.evt.preventDefault();
                  removeRoomPoint(i);
                }}
                onDblTap={() => removeRoomPoint(i)}
              />
            </Fragment>
          );
        })}
      {roomEditMode && (
        <Transformer
          ref={transformerRef}
          rotateEnabled
          rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          borderStroke={palette.accent}
          anchorStroke={palette.accent}
          anchorFill={palette.table}
          {...transformerHandleProps(coarsePointer)}
          keepRatio={singleRound || selectedIds.length > 1}
          // keepRatio solo afecta las esquinas: la columna redonda no usa los anclajes de los bordes.
          enabledAnchors={singleRound || selectedIds.length > 1 ? CORNER_ANCHORS : ALL_ANCHORS}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 2 || Math.abs(newBox.height) < 2) return oldBox;
            return newBox;
          }}
          onTransformEnd={() => {
            const transformer = transformerRef.current;
            if (!transformer) return;
            commitTransform(
              transformer,
              (id) => {
                const f = useCanvasStore.getState().roomFixtures.find((x) => x.id === id);
                return f && { width: f.width, height: f.height, round: f.type === "column-round" };
              },
              MIN_FIXTURE_SIZE
            );
          }}
        />
      )}
    </Layer>
  );
}
