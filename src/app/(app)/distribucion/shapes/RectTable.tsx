import { memo } from "react";
import { Rect, Text } from "react-konva";
import { tableSeatLayout } from "@/lib/guestSeating";
import { LucideVectorIcon } from "@/app/(app)/distribucion/shapes/LucideVectorIcon";
import { TableOccupancy, TableSeats, type SeatOptions } from "@/app/(app)/distribucion/shapes/TableSeats";
import { usePlanTheme } from "@/app/(app)/distribucion/planPalette";

export const RectTable = memo(function RectTable({
  width,
  height,
  capacity,
  label,
  fill,
  isSweetheart,
  pxPerMeter,
  seating,
}: {
  width: number;
  height: number;
  capacity: number | null;
  label: string;
  fill: string | null;
  isSweetheart?: boolean;
  pxPerMeter: number;
  seating?: SeatOptions;
}) {
  const { palette } = usePlanTheme();
  const { points, chairRadius } = tableSeatLayout({ type: "table-rectangular", width, height, capacity }, pxPerMeter);
  // Con "6/8" debajo, el nombre sube un poco (si la mesa es lo bastante alta).
  const labelShift = seating?.view && seating.view.capacity > 0 && height >= 40 ? 6 : 0;

  return (
    <>
      <TableSeats points={points} radius={chairRadius} stroke={isSweetheart ? palette.accent : undefined} options={seating} />
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
        offsetY={height / 2 + labelShift}
        padding={4}
        align="center"
        verticalAlign="middle"
        fontSize={13}
        fontFamily={palette.displayFont}
        fontStyle="600"
        fill={isSweetheart ? palette.accent : palette.ink}
        listening={false}
      />
      {height >= 40 && (
        <TableOccupancy view={seating?.view} detail={seating?.detail ?? true} round={false} width={width} height={height} />
      )}
    </>
  );
});
