"use client";

import { memo, useEffect, useRef } from "react";
import { Arc, Circle, Group, Line, Rect, Text } from "react-konva";
import type Konva from "konva";
import type { RoomFixture } from "@/generated/prisma";
import type { FixtureType } from "@/lib/roomFixtures";

const MIN_SIZE = 2;
const WALL_COLOR = "#57534e";

/**
 * Elemento fijo del salón (pared, columna, puerta...), centrado en (x, y) como los elementos
 * de la boda. Solo se puede seleccionar y arrastrar en el modo "Editar salón".
 */
export const RoomFixtureShape = memo(function RoomFixtureShape({
  fixture,
  editable,
  onSelect,
  onChange,
  registerRef,
}: {
  fixture: RoomFixture;
  editable: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<RoomFixture>) => void;
  registerRef: (id: string, node: Konva.Group | null) => void;
}) {
  const groupRef = useRef<Konva.Group>(null);

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
        return <Rect x={x0} y={y0} width={w} height={h} fill={WALL_COLOR} />;
      case "column":
        return <Rect x={x0} y={y0} width={w} height={h} fill="#a8a29e" stroke={WALL_COLOR} strokeWidth={1.5} />;
      case "column-round":
        return <Circle radius={w / 2} fill="#a8a29e" stroke={WALL_COLOR} strokeWidth={1.5} />;
      case "door":
        // Vano de la puerta + barrido de la hoja (cuarto de círculo desde la bisagra izquierda).
        return (
          <>
            <Arc x={x0} y={h / 2} innerRadius={0} outerRadius={w} angle={90} fill="#f5f5f4" opacity={0.7} stroke={WALL_COLOR} strokeWidth={1} dash={[4, 3]} />
            <Line points={[x0, h / 2, x0, h / 2 + w]} stroke={WALL_COLOR} strokeWidth={2} />
            <Rect x={x0} y={y0} width={w} height={h} fill="#ffffff" stroke={WALL_COLOR} strokeWidth={1} />
          </>
        );
      case "window":
        return (
          <>
            <Rect x={x0} y={y0} width={w} height={h} fill="#dbeafe" stroke="#3a5a8a" strokeWidth={1} />
            <Line points={[x0, 0, w / 2, 0]} stroke="#3a5a8a" strokeWidth={1} />
          </>
        );
      case "emergency-exit":
        return (
          <>
            <Rect x={x0} y={y0} width={w} height={h} fill="#16a34a" />
            <Text x={x0} y={h / 2 + 2} width={w} align="center" text="SALIDA" fontSize={10} fontStyle="bold" fill="#15803d" />
          </>
        );
      case "bar":
        return (
          <>
            <Rect x={x0} y={y0} width={w} height={h} fill="#b08a5a" stroke="#7c5a32" strokeWidth={1.5} cornerRadius={4} />
            <Text
              x={x0}
              y={-6}
              width={w}
              align="center"
              text={label || "Bar"}
              fontSize={12}
              fontStyle="bold"
              fill="#ffffff"
              listening={false}
            />
          </>
        );
      default:
        return <Rect x={x0} y={y0} width={w} height={h} fill="#d6d3d1" />;
    }
  }

  // La etiqueta del bar va adentro; la de los demás, debajo del elemento.
  const showLabelBelow = label && fixture.type !== "bar";

  return (
    <Group
      ref={groupRef}
      x={fixture.x}
      y={fixture.y}
      rotation={fixture.rotation}
      draggable={editable}
      listening={editable}
      onClick={() => editable && onSelect(fixture.id)}
      onTap={() => editable && onSelect(fixture.id)}
      onDragEnd={(e) => onChange(fixture.id, { x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        let width = Math.max(MIN_SIZE, w * scaleX);
        let height = Math.max(MIN_SIZE, h * scaleY);
        // La columna redonda se dibuja con radio w/2: ancho y alto siempre iguales.
        if (fixture.type === "column-round") width = height = Math.max(width, height);
        onChange(fixture.id, { x: node.x(), y: node.y(), rotation: node.rotation(), width, height });
      }}
    >
      {renderShape()}
      {showLabelBelow && (
        <Text
          x={x0 - 40}
          y={h / 2 + (fixture.type === "emergency-exit" ? 14 : 3)}
          width={w + 80}
          align="center"
          text={label}
          fontSize={11}
          fill="#57534e"
          listening={false}
        />
      )}
    </Group>
  );
});
