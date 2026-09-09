import { memo } from "react";
import { Rect, Text } from "react-konva";
import { computeChairGridPositions } from "@/lib/seatGeometry";
import { ChairIcon } from "@/app/distribucion/shapes/ChairIcon";

export const ChairRowBlock = memo(function ChairRowBlock({
  width,
  height,
  rows,
  columns,
  label,
  fill,
}: {
  width: number;
  height: number;
  rows: number | null;
  columns: number | null;
  label: string;
  fill: string | null;
}) {
  const seats = computeChairGridPositions(width, height, rows ?? 1, columns ?? 1);

  return (
    <>
      <Rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fill={fill ?? "#f6f2ea"}
        stroke="#c9a876"
        strokeWidth={1}
        dash={[4, 4]}
        cornerRadius={6}
      />
      {seats.map((seat, i) => (
        <ChairIcon key={i} x={seat.x} y={seat.y} rotation={seat.rotation} color="#a8845c" />
      ))}
      <Text
        text={label}
        width={width}
        y={-height / 2 - 16}
        offsetX={width / 2}
        align="center"
        fontSize={12}
        fontStyle="600"
        fill="#6a5638"
        listening={false}
      />
    </>
  );
});
