import { memo } from "react";
import { Circle, Text } from "react-konva";
import { LucideVectorIcon } from "@/app/(app)/distribucion/shapes/LucideVectorIcon";
import { usePlanTheme } from "@/app/(app)/distribucion/planPalette";

export const CakeTable = memo(function CakeTable({
  width,
  label,
  fill,
}: {
  width: number;
  label: string;
  fill: string | null;
}) {
  const { palette } = usePlanTheme();
  const radius = width / 2;

  return (
    <>
      <Circle
        radius={radius}
        fill={fill ?? palette.table}
        stroke={palette.tableLine}
        strokeWidth={1.5}
        shadowColor="#4a3524"
        shadowOpacity={0.1}
        shadowBlur={5}
        shadowOffsetY={2}
      />
      <LucideVectorIcon name="Cake" y={-radius * 0.3} size={Math.min(20, radius * 0.5)} color={palette.accent} strokeWidth={2} />
      <Text
        text={label}
        y={radius * 0.1}
        width={width}
        height={radius * 0.7}
        offsetX={width / 2}
        align="center"
        verticalAlign="middle"
        fontSize={12}
        fontFamily={palette.displayFont}
        fontStyle="600"
        fill={palette.ink}
        listening={false}
      />
    </>
  );
});
