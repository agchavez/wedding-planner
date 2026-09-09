import { memo } from "react";
import { Group, Rect } from "react-konva";

const SEAT_SIZE = 14;
const BACK_HEIGHT = 5;

/**
 * Silla dibujada con formas nativas de Konva (sin cargar ninguna imagen): rápida y
 * síncrona incluso con decenas de sillas en pantalla al mismo tiempo.
 */
export const ChairIcon = memo(function ChairIcon({
  x,
  y,
  rotation = 0,
  color,
}: {
  x: number;
  y: number;
  rotation?: number;
  color: string;
}) {
  return (
    <Group x={x} y={y} rotation={rotation} listening={false}>
      <Rect
        x={-SEAT_SIZE / 2}
        y={-SEAT_SIZE / 2}
        width={SEAT_SIZE}
        height={SEAT_SIZE}
        cornerRadius={3}
        fill={color}
      />
      <Rect
        x={-SEAT_SIZE / 2}
        y={-SEAT_SIZE / 2 - BACK_HEIGHT + 1}
        width={SEAT_SIZE}
        height={BACK_HEIGHT}
        cornerRadius={2}
        fill={color}
        opacity={0.8}
      />
    </Group>
  );
});
