"use client";

import { Fragment, useCallback, useEffect, useRef } from "react";
import { Circle, Layer, Line, Text, Transformer } from "react-konva";
import type Konva from "konva";
import { useCanvasStore, type Background } from "@/app/(app)/distribucion/canvasStore";
import { RoomFixtureShape } from "@/app/(app)/distribucion/shapes/RoomFixtureShape";
import { formatMeters, pxToMeters, resolvePxPerMeter } from "@/lib/layoutUnits";
import type { RoomPoint } from "@/lib/seatGeometry";

const FILL_BY_BACKGROUND: Record<Background, string> = {
  indoor: "#f5f1ec",
  garden: "#e4ecd8",
};

const VERTEX_RADIUS = 7;
const MIDPOINT_RADIUS = 6;
const VERTEX_COLOR = "#a8415c";
const EDGE_LABEL_WIDTH = 90;
const CORNER_ANCHORS = ["top-left", "top-right", "bottom-left", "bottom-right"];
const ALL_ANCHORS = [...CORNER_ANCHORS, "top-center", "bottom-center", "middle-left", "middle-right"];

function toFlatPoints(points: RoomPoint[]): number[] {
  return points.flatMap((p) => [p.x, p.y]);
}

/**
 * Capa salón: contorno del local + elementos fijos (paredes, columnas, puertas...). Se dibuja
 * debajo de los elementos de la boda y está bloqueada (no escucha eventos) salvo en el modo
 * "Editar salón", donde se arrastran vértices y elementos fijos y se ven las medidas de cada borde.
 */
export function RoomShapeEditor() {
  const roomShape = useCanvasStore((s) => s.roomShape);
  const roomFixtures = useCanvasStore((s) => s.roomFixtures);
  const selectedFixtureId = useCanvasStore((s) => s.selectedFixtureId);
  const roomEditMode = useCanvasStore((s) => s.roomEditMode);
  const background = useCanvasStore((s) => s.background);
  const zoom = useCanvasStore((s) => s.zoom);
  const pxPerMeter = resolvePxPerMeter(useCanvasStore((s) => s.pxPerMeter));
  const updateRoomPoint = useCanvasStore((s) => s.updateRoomPoint);
  const addRoomPoint = useCanvasStore((s) => s.addRoomPoint);
  const removeRoomPoint = useCanvasStore((s) => s.removeRoomPoint);
  const updateFixture = useCanvasStore((s) => s.updateFixture);
  const selectFixture = useCanvasStore((s) => s.selectFixture);

  const nodeRefs = useRef(new Map<string, Konva.Group>());
  const transformerRef = useRef<Konva.Transformer>(null);

  const registerRef = useCallback((id: string, node: Konva.Group | null) => {
    if (node) nodeRefs.current.set(id, node);
    else nodeRefs.current.delete(id);
  }, []);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const node = roomEditMode && selectedFixtureId ? nodeRefs.current.get(selectedFixtureId) : null;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedFixtureId, roomFixtures, roomEditMode]);

  const hasShape = roomShape.length >= 3;
  if (!hasShape && roomFixtures.length === 0 && !roomEditMode) return null;

  const selectedFixture = roomFixtures.find((f) => f.id === selectedFixtureId);
  // Texto de las medidas a tamaño constante en pantalla, sin importar el zoom.
  const labelSize = 12 / zoom;

  return (
    <Layer listening={roomEditMode}>
      {hasShape && (
        <Line
          points={toFlatPoints(roomShape)}
          closed
          fill={FILL_BY_BACKGROUND[background]}
          stroke={roomEditMode ? VERTEX_COLOR : "#c9a876"}
          strokeWidth={roomEditMode ? 2 : 1.5}
          dash={roomEditMode ? [8, 5] : undefined}
          listening={false}
        />
      )}
      {roomFixtures.map((fixture) => (
        <RoomFixtureShape
          key={fixture.id}
          fixture={fixture}
          editable={roomEditMode}
          onSelect={selectFixture}
          onChange={updateFixture}
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
                fill={VERTEX_COLOR}
                listening={false}
              />
              <Circle
                x={mid.x}
                y={mid.y}
                radius={MIDPOINT_RADIUS}
                fill="#ffffff"
                stroke={VERTEX_COLOR}
                strokeWidth={1.5}
                opacity={0.7}
                onClick={() => addRoomPoint(i)}
                onTap={() => addRoomPoint(i)}
              />
              <Text
                x={mid.x - 4}
                y={mid.y - 5}
                text="+"
                fontSize={11}
                fill={VERTEX_COLOR}
                listening={false}
              />
              <Circle
                x={point.x}
                y={point.y}
                radius={VERTEX_RADIUS}
                fill="#ffffff"
                stroke={VERTEX_COLOR}
                strokeWidth={2}
                draggable
                onDragMove={(e: Konva.KonvaEventObject<DragEvent>) =>
                  updateRoomPoint(i, { x: e.target.x(), y: e.target.y() })
                }
                onContextMenu={(e: Konva.KonvaEventObject<MouseEvent>) => {
                  e.evt.preventDefault();
                  removeRoomPoint(i);
                }}
              />
            </Fragment>
          );
        })}
      {roomEditMode && (
        <Transformer
          ref={transformerRef}
          rotateEnabled
          keepRatio={selectedFixture?.type === "column-round"}
          // keepRatio solo afecta las esquinas: la columna redonda no usa los anclajes de los bordes.
          enabledAnchors={selectedFixture?.type === "column-round" ? CORNER_ANCHORS : ALL_ANCHORS}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 2 || Math.abs(newBox.height) < 2) return oldBox;
            return newBox;
          }}
        />
      )}
    </Layer>
  );
}
