import { memo } from "react";
import { Rect, Text } from "react-konva";
import { LucideVectorIcon } from "@/app/(app)/distribucion/shapes/LucideVectorIcon";
import type { LUCIDE_ICON_PATHS } from "@/app/(app)/distribucion/lucideIconPaths";

export const ZoneShape = memo(function ZoneShape({
  width,
  height,
  label,
  iconName,
  fill,
  defaultFill,
  iconColor,
}: {
  width: number;
  height: number;
  label: string;
  iconName?: keyof typeof LUCIDE_ICON_PATHS;
  fill: string | null;
  defaultFill: string;
  iconColor: string;
}) {
  const iconSize = Math.min(24, width * 0.3, height * 0.3);

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
      {iconName && (
        <LucideVectorIcon name={iconName} y={-height * 0.14} size={iconSize} color={iconColor} strokeWidth={2} />
      )}
      <Text
        text={label}
        y={height * 0.08}
        width={width}
        height={height * 0.6}
        offsetX={width / 2}
        align="center"
        verticalAlign="middle"
        fontSize={13}
        fontStyle="600"
        fill={iconColor}
        listening={false}
      />
    </>
  );
});
