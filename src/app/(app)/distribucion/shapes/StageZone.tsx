import { memo } from "react";
import { Rect, Text } from "react-konva";
import { PersonIcon } from "@/app/(app)/distribucion/shapes/PersonIcon";
import { usePlanTheme } from "@/app/(app)/distribucion/planPalette";

/**
 * Escenario / músicos: tarima rayada con una pequeña fila de siluetas de personas para
 * representar a los músicos ocupando el espacio.
 */
export const StageZone = memo(function StageZone({
  width,
  height,
  label,
  fill,
}: {
  width: number;
  height: number;
  label: string;
  fill: string | null;
}) {
  const { palette, patterns } = usePlanTheme();
  const musicianCount = Math.min(6, Math.max(2, Math.round(width / 45)));
  const positions = Array.from({ length: musicianCount }, (_, i) => {
    const gap = width / (musicianCount + 1);
    return { x: -width / 2 + gap * (i + 1), y: 0 };
  });

  return (
    <>
      <Rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fill={fill ?? (patterns.hatch ? undefined : palette.tarima)}
        fillPatternImage={!fill && patterns.hatch ? (patterns.hatch as unknown as HTMLImageElement) : undefined}
        fillPatternRepeat="repeat"
        stroke={palette.zoneLine}
        strokeWidth={1.2}
        cornerRadius={2}
      />
      {positions.map((pos, i) => (
        <PersonIcon key={i} x={pos.x} y={pos.y} color={palette.muted} />
      ))}
      <Text
        text={label.toUpperCase()}
        width={width}
        y={height / 2 - 18}
        offsetX={width / 2}
        align="center"
        fontSize={10}
        letterSpacing={1.5}
        fontFamily={palette.bodyFont}
        fontStyle="600"
        fill={palette.muted}
        listening={false}
      />
    </>
  );
});
