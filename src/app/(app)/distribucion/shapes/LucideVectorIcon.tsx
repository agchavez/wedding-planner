import { memo } from "react";
import { Circle, Group, Path } from "react-konva";
import { LUCIDE_ICON_PATHS } from "@/app/(app)/distribucion/lucideIconPaths";

/**
 * Dibuja un ícono real de lucide-react (rutas SVG extraídas una sola vez, ver
 * lucideIconPaths.ts) como formas nativas de Konva — sin cargar ninguna imagen,
 * síncrono y rápido incluso con muchas instancias en pantalla.
 */
export const LucideVectorIcon = memo(function LucideVectorIcon({
  name,
  x = 0,
  y = 0,
  size = 24,
  rotation = 0,
  color,
  strokeWidth = 2,
}: {
  name: keyof typeof LUCIDE_ICON_PATHS;
  x?: number;
  y?: number;
  size?: number;
  rotation?: number;
  color: string;
  strokeWidth?: number;
}) {
  const primitives = LUCIDE_ICON_PATHS[name];
  if (!primitives) return null;
  const scale = size / 24;

  return (
    <Group x={x} y={y} rotation={rotation} offsetX={12} offsetY={12} scaleX={scale} scaleY={scale} listening={false}>
      {primitives.map((p, i) =>
        p.tag === "path" ? (
          <Path key={i} data={p.d} stroke={color} strokeWidth={strokeWidth} lineCap="round" lineJoin="round" />
        ) : (
          <Circle key={i} x={p.cx} y={p.cy} radius={p.r} stroke={color} strokeWidth={strokeWidth} />
        )
      )}
    </Group>
  );
});
