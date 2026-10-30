import { memo } from "react";
import { Rect, Text } from "react-konva";
import { computeChairGridPositions, getChairMetrics } from "@/lib/seatGeometry";
import { ChairIcon } from "@/app/(app)/distribucion/shapes/ChairIcon";
import { usePlanTheme } from "@/app/(app)/distribucion/planPalette";

export const ChairRowBlock = memo(function ChairRowBlock({
  width,
  height,
  rows,
  columns,
  label,
  fill,
  pxPerMeter,
}: {
  width: number;
  height: number;
  rows: number | null;
  columns: number | null;
  label: string;
  fill: string | null;
  pxPerMeter: number;
}) {
  const { palette } = usePlanTheme();
  const seats = computeChairGridPositions(width, height, rows ?? 1, columns ?? 1);
  const { radius } = getChairMetrics(pxPerMeter);

  return (
    <>
      <Rect
        x={-width / 2 - radius}
        y={-height / 2 - radius}
        width={width + radius * 2}
        height={height + radius * 2}
        fill={fill ?? undefined}
        stroke={palette.zoneLine}
        strokeWidth={1}
        dash={[4, 4]}
        cornerRadius={4}
      />
      {seats.map((seat, i) => (
        <ChairIcon key={i} x={seat.x} y={seat.y} radius={radius} />
      ))}
      <Text
        text={label.toUpperCase()}
        width={width + 80}
        y={-height / 2 - radius - 16}
        offsetX={(width + 80) / 2}
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
