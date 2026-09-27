import { memo } from "react";
import { Circle, Group, Wedge } from "react-konva";

/** Silueta simple de una persona (formas nativas de Konva), usada para músicos en el escenario. */
export const PersonIcon = memo(function PersonIcon({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <Group x={x} y={y} listening={false}>
      <Circle y={-9} radius={4} fill={color} />
      <Wedge y={2} radius={9} angle={180} rotation={180} fill={color} />
    </Group>
  );
});
