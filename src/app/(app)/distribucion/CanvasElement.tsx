"use client";

import { memo, useEffect, useRef } from "react";
import { Circle, Group, Rect } from "react-konva";
import type Konva from "konva";
import type { LayoutElement } from "@/generated/prisma";
import { ELEMENT_ICON_NAME, ELEMENT_LABELS, ZONE_STYLES, isZoneType, type ElementType } from "@/lib/seatGeometry";
import type { LUCIDE_ICON_PATHS } from "@/app/(app)/distribucion/lucideIconPaths";
import { RoundTable } from "@/app/(app)/distribucion/shapes/RoundTable";
import { RectTable } from "@/app/(app)/distribucion/shapes/RectTable";
import { CakeTable } from "@/app/(app)/distribucion/shapes/CakeTable";
import { ChairRowBlock } from "@/app/(app)/distribucion/shapes/ChairRowBlock";
import { StageZone } from "@/app/(app)/distribucion/shapes/StageZone";
import { ZoneShape } from "@/app/(app)/distribucion/shapes/ZoneShape";

const MIN_SIZE = 20;
const HIGHLIGHT_COLOR = "#a8415c";
const HIGHLIGHT_PADDING = 6;

export const CanvasElement = memo(function CanvasElement({
  element,
  isSelected,
  editable = true,
  onSelect,
  onChange,
  registerRef,
}: {
  element: LayoutElement;
  isSelected: boolean;
  /** Falso para roles de solo lectura: no se puede arrastrar ni seleccionar. */
  editable?: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<LayoutElement>) => void;
  registerRef: (id: string, node: Konva.Group | null) => void;
}) {
  const groupRef = useRef<Konva.Group>(null);

  useEffect(() => {
    registerRef(element.id, groupRef.current);
    return () => registerRef(element.id, null);
  }, [element.id, registerRef]);

  function renderShape() {
    const { type, width, height, capacity, rows, columns, label, fill } = element;
    const elementType = type as ElementType;

    switch (elementType) {
      case "table-round":
        return <RoundTable width={width} height={height} capacity={capacity} label={label} fill={fill} />;
      case "table-rectangular":
        return <RectTable width={width} height={height} capacity={capacity} label={label} fill={fill} />;
      case "table-sweetheart":
        return <RectTable width={width} height={height} capacity={capacity} label={label} fill={fill} isSweetheart />;
      case "table-cake":
        return <CakeTable width={width} label={label} fill={fill} />;
      case "chair-row":
        return <ChairRowBlock width={width} height={height} rows={rows} columns={columns} label={label} fill={fill} />;
      case "stage":
        return <StageZone width={width} height={height} label={label || ELEMENT_LABELS.stage} fill={fill} />;
      default: {
        if (isZoneType(elementType)) {
          const style = ZONE_STYLES[elementType];
          return (
            <ZoneShape
              width={width}
              height={height}
              label={label || ELEMENT_LABELS[elementType]}
              iconName={ELEMENT_ICON_NAME[elementType] as keyof typeof LUCIDE_ICON_PATHS | undefined}
              fill={fill}
              defaultFill={style?.fill ?? "#eee"}
              iconColor={style?.iconColor ?? "#555"}
            />
          );
        }
        return null;
      }
    }
  }

  function renderHighlight() {
    if (!isSelected) return null;
    if (element.type === "table-round") {
      return (
        <Circle
          radius={element.width / 2 + HIGHLIGHT_PADDING}
          stroke={HIGHLIGHT_COLOR}
          strokeWidth={2}
          dash={[5, 4]}
          listening={false}
        />
      );
    }
    return (
      <Rect
        x={-element.width / 2 - HIGHLIGHT_PADDING}
        y={-element.height / 2 - HIGHLIGHT_PADDING}
        width={element.width + HIGHLIGHT_PADDING * 2}
        height={element.height + HIGHLIGHT_PADDING * 2}
        stroke={HIGHLIGHT_COLOR}
        strokeWidth={2}
        dash={[5, 4]}
        cornerRadius={14}
        listening={false}
      />
    );
  }

  return (
    <Group
      ref={groupRef}
      x={element.x}
      y={element.y}
      rotation={element.rotation}
      draggable={editable}
      onClick={() => editable && onSelect(element.id)}
      onTap={() => editable && onSelect(element.id)}
      onDragEnd={(e) => onChange(element.id, { x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange(element.id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: Math.max(MIN_SIZE, element.width * scaleX),
          height: Math.max(MIN_SIZE, element.height * scaleY),
        });
      }}
    >
      {renderHighlight()}
      {renderShape()}
    </Group>
  );
});
