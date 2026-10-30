import { memo } from "react";
import { Circle, Text } from "react-konva";
import { tableSeatLayout } from "@/lib/guestSeating";
import { TableOccupancy, TableSeats, type SeatOptions } from "@/app/(app)/distribucion/shapes/TableSeats";
import { usePlanTheme } from "@/app/(app)/distribucion/planPalette";

export const RoundTable = memo(function RoundTable({
  width,
  height,
  capacity,
  label,
  fill,
  pxPerMeter,
  seating,
}: {
  width: number;
  height: number;
  capacity: number | null;
  label: string;
  fill: string | null;
  pxPerMeter: number;
  seating?: SeatOptions;
}) {
  const { palette } = usePlanTheme();
  const radius = width / 2;
  const { points, chairRadius } = tableSeatLayout({ type: "table-round", width, height, capacity }, pxPerMeter);
  // Con "6/8" debajo, el nombre sube un poco.
  const labelShift = seating?.view && seating.view.capacity > 0 ? 7 : 0;

  return (
    <>
      <TableSeats points={points} radius={chairRadius} options={seating} />
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
        offsetY={height / 2 + labelShift}
        padding={4}
        align="center"
        verticalAlign="middle"
        fontSize={14}
        fontFamily={palette.displayFont}
        fontStyle="600"
        fill={palette.ink}
        listening={false}
      />
      <TableOccupancy view={seating?.view} detail={seating?.detail ?? true} round width={width} height={height} />
    </>
  );
});
