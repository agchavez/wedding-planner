import { memo } from "react";
import { Circle, Text } from "react-konva";
import { LucideVectorIcon } from "@/app/(app)/distribucion/shapes/LucideVectorIcon";

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
      <LucideVectorIcon name="Cake" y={-radius * 0.35} size={Math.min(20, radius * 0.5)} color={ICON_COLOR} strokeWidth={2} />
      <Text
        text={label}
        y={radius * 0.15}
        width={width}
        height={radius}
        offsetX={width / 2}
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
