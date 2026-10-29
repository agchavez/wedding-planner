"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import { Circle, Group, Rect } from "react-konva";
import type Konva from "konva";
import type { LayoutElement } from "@/generated/prisma";
import { ELEMENT_ICON_NAME, ELEMENT_LABELS, getElementFootprint, isTableType, isZoneType, type ElementType } from "@/lib/seatGeometry";
import { formatDimensions, pxToMeters } from "@/lib/layoutUnits";
import type { LUCIDE_ICON_PATHS } from "@/app/(app)/distribucion/lucideIconPaths";
import { usePlanTheme } from "@/app/(app)/distribucion/planPalette";
import type { DragHandlers } from "@/app/(app)/distribucion/useSelectionDrag";
import { RoundTable } from "@/app/(app)/distribucion/shapes/RoundTable";
import { RectTable } from "@/app/(app)/distribucion/shapes/RectTable";
import { CakeTable } from "@/app/(app)/distribucion/shapes/CakeTable";
import { ChairRowBlock } from "@/app/(app)/distribucion/shapes/ChairRowBlock";
import { StageZone } from "@/app/(app)/distribucion/shapes/StageZone";
import { ZoneShape } from "@/app/(app)/distribucion/shapes/ZoneShape";
import type { SeatHandlers, SeatOptions } from "@/app/(app)/distribucion/shapes/TableSeats";
import { buildTableSeatView } from "@/app/(app)/distribucion/seatingView";
import type { SeatingGuest } from "@/lib/guestSeating";

const HIGHLIGHT_PADDING = 4;

export const CanvasElement = memo(function CanvasElement({
  element,
  isSelected,
  editable = true,
  panning = false,
  pxPerMeter,
  onSelect,
  drag,
  registerRef,
  seatedGuests,
  seatColorOf,
  seatHandlers,
  seatDetail = true,
}: {
  element: LayoutElement;
  isSelected: boolean;
  /** Falso para roles de solo lectura: no se puede arrastrar ni seleccionar. */
  editable?: boolean;
  /** Con la herramienta "mover el plano" (o Espacio) arrastrar mueve el plano, nunca el elemento. */
  panning?: boolean;
  pxPerMeter: number;
  onSelect: (id: string, additive: boolean) => void;
  drag: DragHandlers;
  registerRef: (id: string, node: Konva.Group | null) => void;
  /** Mesas: invitados sentados (en el orden del servidor) y el color de cada uno. */
  seatedGuests?: SeatingGuest[];
  seatColorOf?: (guest: SeatingGuest) => string;
  /** Tocar/arrastrar sillas (sin esto las sillas no responden). */
  seatHandlers?: SeatHandlers;
  /** Zoom suficiente para mostrar iniciales en las sillas. */
  seatDetail?: boolean;
}) {
  const groupRef = useRef<Konva.Group>(null);
  const { palette } = usePlanTheme();

  const isTable = isTableType(element.type);
  const seatView = useMemo(
    () => (isTable && seatedGuests && seatColorOf ? buildTableSeatView(element.capacity, seatedGuests, seatColorOf) : undefined),
    [isTable, element.capacity, seatedGuests, seatColorOf]
  );

  useEffect(() => {
    registerRef(element.id, groupRef.current);
    return () => registerRef(element.id, null);
  }, [element.id, registerRef]);

  function renderShape() {
    const { type, width, height, capacity, rows, columns, label, fill } = element;
    const elementType = type as ElementType;
    const seating: SeatOptions = {
      tableId: element.id,
      view: seatView,
      handlers: seatHandlers,
      detail: seatDetail,
      // Arrastrar un invitado de su silla solo con la herramienta de selección.
      draggable: editable && !panning,
      rotation: element.rotation,
    };

    switch (elementType) {
      case "table-round":
        return (
          <RoundTable width={width} height={height} capacity={capacity} label={label} fill={fill} pxPerMeter={pxPerMeter} seating={seating} />
        );
      case "table-rectangular":
        return (
          <RectTable width={width} height={height} capacity={capacity} label={label} fill={fill} pxPerMeter={pxPerMeter} seating={seating} />
        );
      case "table-sweetheart":
        return (
          <RectTable
            width={width}
            height={height}
            capacity={capacity}
            label={label}
            fill={fill}
            pxPerMeter={pxPerMeter}
            seating={seating}
            isSweetheart
          />
        );
      case "table-cake":
        return <CakeTable width={width} label={label} fill={fill} />;
      case "chair-row":
        return (
          <ChairRowBlock width={width} height={height} rows={rows} columns={columns} label={label} fill={fill} pxPerMeter={pxPerMeter} />
        );
      case "stage":
        return <StageZone width={width} height={height} label={label || ELEMENT_LABELS.stage} fill={fill} />;
      default: {
        if (isZoneType(elementType)) {
          return (
            <ZoneShape
              width={width}
              height={height}
              label={label || ELEMENT_LABELS[elementType]}
              iconName={ELEMENT_ICON_NAME[elementType] as keyof typeof LUCIDE_ICON_PATHS | undefined}
              fill={fill}
              texture={elementType === "dance-floor" ? "parquet" : undefined}
              sizeLabel={
                elementType === "dance-floor"
                  ? formatDimensions(pxToMeters(width, pxPerMeter), pxToMeters(height, pxPerMeter))
                  : undefined
              }
            />
          );
        }
        return null;
      }
    }
  }

  function renderHighlight() {
    if (!isSelected) return null;
    // Marco punteado alrededor de la huella real (mesa + sillas).
    const footprint = getElementFootprint(element, pxPerMeter);
    if (footprint.round) {
      return (
        <Circle
          radius={footprint.width / 2 + HIGHLIGHT_PADDING}
          stroke={palette.accent}
          strokeWidth={1.6}
          dash={[5, 4]}
          listening={false}
        />
      );
    }
    return (
      <Rect
        x={-footprint.width / 2 - HIGHLIGHT_PADDING}
        y={-footprint.height / 2 - HIGHLIGHT_PADDING}
        width={footprint.width + HIGHLIGHT_PADDING * 2}
        height={footprint.height + HIGHLIGHT_PADDING * 2}
        stroke={palette.accent}
        strokeWidth={1.6}
        dash={[5, 4]}
        cornerRadius={4}
        listening={false}
      />
    );
  }

  const additive = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) =>
    "shiftKey" in e.evt && (e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey);

  return (
    <Group
      ref={groupRef}
      id={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation}
      draggable={editable && !panning}
      onClick={(e) => editable && onSelect(element.id, additive(e))}
      onTap={() => editable && onSelect(element.id, false)}
      onDragStart={() => drag.onDragStart(element.id)}
      onDragMove={(e) => drag.onDragMove(element.id, e.target, e.evt)}
      onDragEnd={() => drag.onDragEnd(element.id)}
    >
      {renderShape()}
      {renderHighlight()}
    </Group>
  );
});
