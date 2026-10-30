import { memo } from "react";
import { Circle, Text } from "react-konva";
import { computeSeatPositions, getChairMetrics } from "@/lib/seatGeometry";
import { ChairIcon } from "@/app/(app)/distribucion/shapes/ChairIcon";
import { usePlanTheme } from "@/app/(app)/distribucion/planPalette";

export const RoundTable = memo(function RoundTable({
  width,
  height,
  capacity,
  label,
  fill,
  pxPerMeter,
}: {
  width: number;
  height: number;
  capacity: number | null;
  label: string;
  fill: string | null;
  pxPerMeter: number;
}) {
  const { palette } = usePlanTheme();
  const radius = width / 2;
  const chair = getChairMetrics(pxPerMeter);
  const seats = computeSeatPositions("table-round", width, height, capacity ?? 0, chair.offset);

  return (
    <>
      {seats.map((seat, i) => (
        <ChairIcon key={i} x={seat.x} y={seat.y} radius={chair.radius} />
      ))}
      <Circle
        radius={radius}
        fill={fill ?? palette.table}
        stroke={palette.tableLine}
        strokeWidth={1.5}
        shadowColor="#4a3524"
        shadowOpacity={0.12}
        shadowBlur={6}
        shadowOffsetY={2}
      />
      <Text
        text={label}
        width={width}
        height={height}
        offsetX={width / 2}
        offsetY={height / 2}
        padding={4}
        align="center"
        verticalAlign="middle"
        fontSize={14}
        fontFamily={palette.displayFont}
        fontStyle="600"
        fill={palette.ink}
        listening={false}
      />
    </>
  );
});
