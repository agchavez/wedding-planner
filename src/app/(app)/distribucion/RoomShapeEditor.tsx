"use client";

import { Fragment } from "react";
import { Circle, Layer, Line, Text } from "react-konva";
import type Konva from "konva";
import { useCanvasStore, type Background } from "@/app/(app)/distribucion/canvasStore";
import type { RoomPoint } from "@/lib/seatGeometry";

const FILL_BY_BACKGROUND: Record<Background, string> = {
  indoor: "#f5f1ec",
  garden: "#e4ecd8",
};

const VERTEX_RADIUS = 7;
const MIDPOINT_RADIUS = 6;
const VERTEX_COLOR = "#a8415c";

function toFlatPoints(points: RoomPoint[]): number[] {
  return points.flatMap((p) => [p.x, p.y]);
}

/** Contorno del local: polígono editable (modo edición) o solo de fondo visual. */
export function RoomShapeEditor() {
  const roomShape = useCanvasStore((s) => s.roomShape);
  const roomEditMode = useCanvasStore((s) => s.roomEditMode);
  const background = useCanvasStore((s) => s.background);
  const updateRoomPoint = useCanvasStore((s) => s.updateRoomPoint);
  const addRoomPoint = useCanvasStore((s) => s.addRoomPoint);
  const removeRoomPoint = useCanvasStore((s) => s.removeRoomPoint);

  if (roomShape.length < 3) return null;

  return (
    <Layer>
      <Line
        points={toFlatPoints(roomShape)}
        closed
        fill={FILL_BY_BACKGROUND[background]}
        stroke={roomEditMode ? VERTEX_COLOR : "#c9a876"}
        strokeWidth={roomEditMode ? 2 : 1.5}
        dash={roomEditMode ? [8, 5] : undefined}
        listening={false}
      />
      {roomEditMode &&
        roomShape.map((point, i) => {
          const next = roomShape[(i + 1) % roomShape.length];
          const mid = { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 };
          return (
            <Fragment key={i}>
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
    </Layer>
  );
}
