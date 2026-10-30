"use client";

import { memo, useEffect, useRef } from "react";
import { Arc, Circle, Group, Line, Rect, Text } from "react-konva";
import type Konva from "konva";
import type { RoomFixture } from "@/generated/prisma";
import type { FixtureType } from "@/lib/roomFixtures";
import { usePlanTheme } from "@/app/(app)/distribucion/planPalette";
import type { DragHandlers } from "@/app/(app)/distribucion/useSelectionDrag";

const EXIT_COLOR = "#16a34a";
const WINDOW_COLOR = "#6f8fb8";

/**
 * Elemento fijo del salón (pared, columna, puerta...), centrado en (x, y) como los elementos
 * de la boda. Paredes y columnas en nogal (estilo "Papel y lino"). Solo se puede seleccionar y
 * arrastrar en el modo "Editar salón".
 */
export const RoomFixtureShape = memo(function RoomFixtureShape({
  fixture,
  editable,
  panning = false,
  isSelected,
  onSelect,
  drag,
  registerRef,
}: {
  fixture: RoomFixture;
  editable: boolean;
  /** Con la herramienta "mover el plano" arrastrar mueve el plano, no el elemento fijo. */
  panning?: boolean;
  isSelected: boolean;
  onSelect: (id: string, additive: boolean) => void;
  drag: DragHandlers;
  registerRef: (id: string, node: Konva.Group | null) => void;
}) {
  const groupRef = useRef<Konva.Group>(null);
  const { palette } = usePlanTheme();
  const wall = palette.wall;

  useEffect(() => {
    registerRef(fixture.id, groupRef.current);
    return () => registerRef(fixture.id, null);
  }, [fixture.id, registerRef]);

  const { width: w, height: h, label } = fixture;
  const x0 = -w / 2;
  const y0 = -h / 2;

  function renderShape() {
    switch (fixture.type as FixtureType) {
      case "wall":
        return <Rect x={x0} y={y0} width={w} height={h} fill={wall} />;
      case "column":
        // Columna maciza con una cruz, como en los planos de arquitectura.
        return (
          <>
            <Rect x={x0} y={y0} width={w} height={h} fill={wall} />
            <Line points={[x0, y0, -x0, -y0, x0, -y0, -x0, y0]} stroke={palette.floor} strokeWidth={1.2} opacity={0.6} />
          </>
        );
      case "column-round":
        return <Circle radius={w / 2} fill={wall} />;
      case "door":
        // Vano de la puerta + barrido de la hoja (cuarto de círculo desde la bisagra izquierda).
        return (
          <>
            <Arc x={x0} y={h / 2} innerRadius={0} outerRadius={w} angle={90} stroke={wall} strokeWidth={1.4} dash={[4, 3]} opacity={0.75} />
            <Line points={[x0, h / 2, x0, h / 2 + w]} stroke={wall} strokeWidth={2.5} />
            <Rect x={x0} y={y0} width={w} height={h} fill={palette.floor} stroke={wall} strokeWidth={1} />
          </>
        );
      case "window":
        return (
          <>
            <Rect x={x0} y={y0} width={w} height={h} fill={palette.floor} stroke={wall} strokeWidth={1.2} />
            <Line points={[x0, 0, -x0, 0]} stroke={WINDOW_COLOR} strokeWidth={1.5} />
          </>
        );
      case "emergency-exit":
        return (
          <>
            <Rect x={x0} y={y0} width={w} height={h} fill={EXIT_COLOR} />
            <Text x={x0} y={h / 2 + 2} width={w} align="center" text="SALIDA" fontSize={10} fontStyle="bold" fill={EXIT_COLOR} />
          </>
        );
      case "bar":
        return (
          <>
            <Rect x={x0} y={y0} width={w} height={h} fill={palette.zone} stroke={palette.zoneLine} strokeWidth={1.2} cornerRadius={3} />
            <Text
              x={x0}
              y={-5}
              width={w}
              align="center"
              text={(label || "Bar").toUpperCase()}
              fontSize={10}
              letterSpacing={1.5}
              fontFamily={palette.bodyFont}
              fontStyle="600"
              fill={palette.muted}
              listening={false}
            />
          </>
        );
      default:
        return <Rect x={x0} y={y0} width={w} height={h} fill={palette.zone} />;
    }
  }

  // La etiqueta del bar va adentro; la de los demás, debajo del elemento.
  const showLabelBelow = label && fixture.type !== "bar";
  const additive = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) =>
    "shiftKey" in e.evt && (e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey);

  return (
    <Group
      ref={groupRef}
      id={fixture.id}
      x={fixture.x}
      y={fixture.y}
      rotation={fixture.rotation}
      draggable={editable && !panning}
      listening={editable}
      onClick={(e) => editable && onSelect(fixture.id, additive(e))}
      onTap={() => editable && onSelect(fixture.id, false)}
      onDragStart={() => drag.onDragStart(fixture.id)}
      onDragMove={(e) => drag.onDragMove(fixture.id, e.target, e.evt)}
      onDragEnd={() => drag.onDragEnd(fixture.id)}
    >
      {renderShape()}
      {isSelected && (
        <Rect
          x={x0 - 4}
          y={y0 - 4}
          width={w + 8}
          height={h + 8}
          stroke={palette.accent}
          strokeWidth={1.4}
          dash={[5, 4]}
          listening={false}
        />
      )}
      {showLabelBelow && (
        <Text
          x={x0 - 40}
          y={h / 2 + (fixture.type === "emergency-exit" ? 14 : 3)}
          width={w + 80}
          align="center"
          text={label}
          fontSize={11}
          fontFamily={palette.bodyFont}
          fill={palette.muted}
          listening={false}
        />
      )}
    </Group>
  );
});
