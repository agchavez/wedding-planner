import { memo } from "react";
import { Rect, Text } from "react-konva";
import { computeSeatPositions } from "@/lib/seatGeometry";
import { ChairIcon } from "@/app/(app)/distribucion/shapes/ChairIcon";

export const RectTable = memo(function RectTable({
  width,
  height,
  capacity,
  label,
  fill,
  isSweetheart,
}: {
  width: number;
  height: number;
  capacity: number | null;
  label: string;
  fill: string | null;
  isSweetheart?: boolean;
}) {
  const seats = computeSeatPositions("table-rectangular", width, height, capacity ?? 0);

  return (
    <>
      <Rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fill={fill ?? (isSweetheart ? "#fbe6ec" : "#faf1e4")}
        stroke={isSweetheart ? "#a8415c" : "#c9a876"}
        strokeWidth={2}
        cornerRadius={isSweetheart ? width : 8}
        shadowColor="#000000"
        shadowOpacity={0.15}
        shadowBlur={8}
        shadowOffsetY={3}
      />
      {seats.map((seat, i) => (
        <ChairIcon key={i} x={seat.x} y={seat.y} rotation={seat.rotation} color={isSweetheart ? "#a8415c" : "#a8845c"} />
      ))}
      <Text
        text={isSweetheart ? `💕 ${label}` : label}
        width={width}
        height={height}
        offsetX={width / 2}
        offsetY={height / 2}
        align="center"
        verticalAlign="middle"
        fontSize={13}
        fontStyle="600"
        fill={isSweetheart ? "#7a2f45" : "#3f2e1a"}
        listening={false}
      />
    </>
  );
});
