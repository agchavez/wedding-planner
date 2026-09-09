import { memo } from "react";
import { Rect, Text } from "react-konva";
import { PersonIcon } from "@/app/distribucion/shapes/PersonIcon";

const ICON_COLOR = "#6d4a96";

/**
 * Escenario / músicos: en vez de un solo ícono genérico, dibuja una pequeña fila de
 * siluetas de personas para representar a los músicos ocupando el espacio.
 */
export const StageZone = memo(function StageZone({
  width,
  height,
  label,
  fill,
}: {
  width: number;
  height: number;
  label: string;
  fill: string | null;
}) {
  const musicianCount = Math.min(6, Math.max(2, Math.round(width / 45)));
  const positions = Array.from({ length: musicianCount }, (_, i) => {
    const gap = width / (musicianCount + 1);
    return { x: -width / 2 + gap * (i + 1), y: 4 };
  });

  return (
    <>
      <Rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        fill={fill ?? "#efe6f7"}
        stroke={ICON_COLOR}
        strokeWidth={1.5}
        dash={[7, 5]}
        cornerRadius={12}
      />
      {positions.map((pos, i) => (
        <PersonIcon key={i} x={pos.x} y={pos.y} color={ICON_COLOR} />
      ))}
      <Text
        text={label}
        width={width}
        y={height / 2 - 20}
        offsetX={width / 2}
        align="center"
        fontSize={13}
        fontStyle="600"
        fill={ICON_COLOR}
        listening={false}
      />
    </>
  );
});
