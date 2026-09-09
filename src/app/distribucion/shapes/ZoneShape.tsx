import { memo } from "react";
import { Rect, Text } from "react-konva";

export const ZoneShape = memo(function ZoneShape({
  width,
  height,
  label,
  icon,
  fill,
  defaultFill,
  iconColor,
}: {
  width: number;
  height: number;
  label: string;
  icon: string;
  fill: string | null;
  defaultFill: string;
  iconColor: string;
}) {
  return (
    <>
      <Rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fill={fill ?? defaultFill}
        stroke={iconColor}
        strokeWidth={1.5}
        dash={[7, 5]}
        cornerRadius={12}
      />
      <Text
        text={`${icon}\n${label}`}
        width={width}
        height={height}
        offsetX={width / 2}
        offsetY={height / 2}
        align="center"
        verticalAlign="middle"
        fontSize={14}
        fontStyle="600"
        fill={iconColor}
        listening={false}
      />
    </>
  );
});
