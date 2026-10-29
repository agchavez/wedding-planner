import { memo } from "react";
import { Rect, Text } from "react-konva";
import { computeSeatPositions, getChairMetrics } from "@/lib/seatGeometry";
import { ChairIcon } from "@/app/(app)/distribucion/shapes/ChairIcon";
import { LucideVectorIcon } from "@/app/(app)/distribucion/shapes/LucideVectorIcon";
import { usePlanTheme } from "@/app/(app)/distribucion/planPalette";

export const RectTable = memo(function RectTable({
  width,
  height,
  capacity,
  label,
  fill,
  isSweetheart,
  pxPerMeter,
}: {
  width: number;
  height: number;
  capacity: number | null;
  label: string;
  fill: string | null;
  isSweetheart?: boolean;
  pxPerMeter: number;
}) {
  const { palette } = usePlanTheme();
  const chair = getChairMetrics(pxPerMeter);
  const seats = computeSeatPositions("table-rectangular", width, height, capacity ?? 0, chair.offset);
  // En mesas largas con muchas sillas, que no se encimen entre sí.
  const perSide = Math.ceil((capacity ?? 0) / 2);
  const chairRadius = perSide > 0 ? Math.min(chair.radius, (width / (perSide + 1)) * 0.46) : chair.radius;

  return (
    <>
      {seats.map((seat, i) => (
        <ChairIcon key={i} x={seat.x} y={seat.y} radius={chairRadius} stroke={isSweetheart ? palette.accent : undefined} />
      ))}
      <Rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fill={fill ?? palette.table}
        stroke={isSweetheart ? palette.accent : palette.tableLine}
        strokeWidth={1.5}
        cornerRadius={isSweetheart ? Math.min(width, height) / 2 : 3}
        shadowColor="#4a3524"
        shadowOpacity={0.12}
        shadowBlur={6}
        shadowOffsetY={2}
      />
      {isSweetheart && (
        <LucideVectorIcon name="Heart" x={-width / 2 + 14} size={12} color={palette.accent} strokeWidth={2.5} />
      )}
      <Text
        text={label}
        width={width}
        height={height}
        offsetX={width / 2}
        offsetY={height / 2}
        padding={4}
        align="center"
        verticalAlign="middle"
        fontSize={13}
        fontFamily={palette.displayFont}
        fontStyle="600"
        fill={isSweetheart ? palette.accent : palette.ink}
        listening={false}
      />
    </>
  );
});
