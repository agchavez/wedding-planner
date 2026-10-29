"use client";

import { Group, Layer, Line, Rect, Text } from "react-konva";
import { useCanvasStore } from "@/app/(app)/distribucion/canvasStore";
import { usePlanTheme } from "@/app/(app)/distribucion/planPalette";
import { formatMeters, pxToMeters, resolvePxPerMeter } from "@/lib/layoutUnits";

const LABEL_WIDTH = 56;
const LABEL_HEIGHT = 18;

/**
 * Guías inteligentes del arrastre en curso: líneas de alineación y la distancia (en metros)
 * hasta el vecino más cercano. Todo se dibuja a tamaño constante en pantalla.
 */
export function SnapGuidesLayer() {
  const guides = useCanvasStore((s) => s.snapGuides);
  const zoom = useCanvasStore((s) => s.zoom);
  const pxPerMeter = resolvePxPerMeter(useCanvasStore((s) => s.pxPerMeter));
  const { palette } = usePlanTheme();
  if (!guides) return null;

  const stroke = 1.2 / zoom;
  const gap = guides.gap;
  const tick = 6 / zoom;
  const vertical = gap ? gap.x1 === gap.x2 : false;

  return (
    <Layer listening={false}>
      {guides.lines.map((line, i) => (
        <Line key={i} points={[line.x1, line.y1, line.x2, line.y2]} stroke={palette.accent} strokeWidth={stroke} dash={[4 / zoom, 3 / zoom]} />
      ))}
      {gap && gap.distance > 0 && (
        <Group>
          <Line points={[gap.x1, gap.y1, gap.x2, gap.y2]} stroke={palette.accent} strokeWidth={stroke} />
          {[
            [gap.x1, gap.y1],
            [gap.x2, gap.y2],
          ].map(([x, y], i) => (
            <Line
              key={i}
              points={vertical ? [x - tick, y, x + tick, y] : [x, y - tick, x, y + tick]}
              stroke={palette.accent}
              strokeWidth={stroke}
            />
          ))}
          <Group
            x={(gap.x1 + gap.x2) / 2 + (vertical ? 10 / zoom : -LABEL_WIDTH / zoom / 2)}
            y={(gap.y1 + gap.y2) / 2 + (vertical ? -LABEL_HEIGHT / zoom / 2 : 8 / zoom)}
            scaleX={1 / zoom}
            scaleY={1 / zoom}
          >
            <Rect width={LABEL_WIDTH} height={LABEL_HEIGHT} cornerRadius={5} fill={palette.accent} />
            <Text
              width={LABEL_WIDTH}
              height={LABEL_HEIGHT}
              align="center"
              verticalAlign="middle"
              text={formatMeters(pxToMeters(gap.distance, pxPerMeter))}
              fontSize={10.5}
              fontStyle="600"
              fontFamily={palette.bodyFont}
              fill={palette.onAccent}
            />
          </Group>
        </Group>
      )}
    </Layer>
  );
}
