import { memo } from "react";
import { Circle } from "react-konva";
import { usePlanTheme } from "@/app/(app)/distribucion/planPalette";

/**
 * Silla vista desde arriba: un círculo a escala real (≈0.45 m, ver getChairMetrics). Formas
 * nativas de Konva, sin imágenes: rápida incluso con cientos de sillas en pantalla.
 */
export const ChairIcon = memo(function ChairIcon({
  x,
  y,
  radius,
  stroke,
}: {
  x: number;
  y: number;
  radius: number;
  stroke?: string;
}) {
  const { palette } = usePlanTheme();
  return (
    <Circle
      x={x}
      y={y}
      radius={radius}
      fill={palette.chair}
      stroke={stroke ?? palette.tableLine}
      strokeWidth={1.2}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
});
