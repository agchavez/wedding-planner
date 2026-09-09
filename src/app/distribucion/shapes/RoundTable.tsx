import { memo } from "react";
import { Circle, Text } from "react-konva";
import { computeSeatPositions } from "@/lib/seatGeometry";
import { ChairIcon } from "@/app/distribucion/shapes/ChairIcon";

export const RoundTable = memo(function RoundTable({
  width,
  height,
  capacity,
  label,
  fill,
}: {
  width: number;
  height: number;
  capacity: number | null;
  label: string;
  fill: string | null;
}) {
  const radius = width / 2;
  const seats = computeSeatPositions("table-round", width, height, capacity ?? 0);

  return (
    <>
      <Circle
        radius={radius}
        fill={fill ?? "#faf1e4"}
        stroke="#c9a876"
        strokeWidth={2}
        shadowColor="#000000"
        shadowOpacity={0.15}
        shadowBlur={8}
        shadowOffsetY={3}
      />
      {seats.map((seat, i) => (
        <ChairIcon key={i} x={seat.x} y={seat.y} rotation={seat.rotation} color="#a8845c" />
      ))}
      <Text
        text={label}
        width={width}
        height={height}
        offsetX={width / 2}
        offsetY={height / 2}
        align="center"
        verticalAlign="middle"
        fontSize={13}
        fontStyle="600"
        fill="#3f2e1a"
        listening={false}
      />
    </>
  );
});
