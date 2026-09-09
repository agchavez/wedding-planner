import { memo } from "react";
import { Circle, Text } from "react-konva";

const ICON_COLOR = "#a8415c";

export const CakeTable = memo(function CakeTable({
  width,
  label,
  fill,
}: {
  width: number;
  label: string;
  fill: string | null;
}) {
  const radius = width / 2;

  return (
    <>
      <Circle
        radius={radius}
        fill={fill ?? "#fbe9f2"}
        stroke={ICON_COLOR}
        strokeWidth={2}
        dash={[6, 4]}
        shadowColor="#000000"
        shadowOpacity={0.1}
        shadowBlur={6}
        shadowOffsetY={2}
      />
      <Text
        text={`🎂\n${label}`}
        width={width}
        height={width}
        offsetX={width / 2}
        offsetY={width / 2}
        align="center"
        verticalAlign="middle"
        fontSize={13}
        fontStyle="600"
        fill={ICON_COLOR}
        listening={false}
      />
    </>
  );
});
