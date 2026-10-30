import { memo } from "react";
import { Rect, Text } from "react-konva";
import { LucideVectorIcon } from "@/app/(app)/distribucion/shapes/LucideVectorIcon";
import { usePlanTheme } from "@/app/(app)/distribucion/planPalette";
import type { LUCIDE_ICON_PATHS } from "@/app/(app)/distribucion/lucideIconPaths";

/**
 * Zona del plano (pista, área de fotos, altar, entrada...): rectángulo con textura según el tipo
 * ("parquet" para la pista), ícono, nombre en versalitas y, opcionalmente, sus medidas.
 */
export const ZoneShape = memo(function ZoneShape({
  width,
  height,
  label,
  iconName,
  fill,
  texture,
  sizeLabel,
}: {
  width: number;
  height: number;
  label: string;
  iconName?: keyof typeof LUCIDE_ICON_PATHS;
  fill: string | null;
  texture?: "parquet" | "hatch";
  sizeLabel?: string;
}) {
  const { palette, patterns } = usePlanTheme();
  const iconSize = Math.min(22, width * 0.3, height * 0.3);
  const pattern = texture ? patterns[texture] : null;
  const fontSize = Math.max(8, Math.min(11, width / 12));

  return (
    <>
      <Rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fill={fill ?? (pattern ? undefined : palette.zone)}
        fillPatternImage={!fill && pattern ? (pattern as unknown as HTMLImageElement) : undefined}
        fillPatternRepeat="repeat"
        stroke={palette.zoneLine}
        strokeWidth={1.2}
        cornerRadius={3}
      />
      {iconName && (
        <LucideVectorIcon name={iconName} y={-height * 0.14} size={iconSize} color={palette.muted} strokeWidth={2} />
      )}
      <Text
        text={label.toUpperCase()}
        y={height * 0.08}
        width={width}
        height={height * 0.4}
        offsetX={width / 2}
        padding={2}
        align="center"
        verticalAlign="middle"
        fontSize={fontSize}
        letterSpacing={1.5}
        fontFamily={palette.bodyFont}
        fontStyle="600"
        fill={palette.muted}
        listening={false}
      />
      {sizeLabel && height > 50 && (
        <Text
          text={sizeLabel}
          y={height * 0.08 + height * 0.3}
          width={width}
          offsetX={width / 2}
          align="center"
          fontSize={Math.max(8, fontSize - 1)}
          fontFamily={palette.bodyFont}
          fill={palette.muted}
          listening={false}
        />
      )}
    </>
  );
});
