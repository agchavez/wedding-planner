import { memo } from "react";
import { Arc, Circle, Group, Rect, Text } from "react-konva";
import type Konva from "konva";
import type { SeatPoint } from "@/lib/seatGeometry";
import { usePlanTheme } from "@/app/(app)/distribucion/planPalette";
import { useGuestSeatingStore } from "@/app/(app)/distribucion/guestSeatingStore";

/** Silla ocupada tal como se dibuja: iniciales y color por lado/grupo del invitado. */
export type SeatView = { guestId: string; companion: number; label: string; color: string };

/** Ocupación de una mesa para el plano (ver resolveTableSeats en lib/guestSeating.ts). */
export type TableSeatView = { seats: (SeatView | null)[]; occupied: number; capacity: number };

/** Lo que pasa al tocar o arrastrar una silla; lo arma el editor (SeatingEditor). */
export type SeatHandlers = {
  onSeatClick: (tableId: string, seatIndex: number) => void;
  onGuestDragStart: (guestId: string) => void;
  /** `evt` es el evento nativo (ratón o toque) que movió el puntero. */
  onGuestDragMove: (stage: Konva.Stage | null, evt: Event | undefined) => void;
  /** `evt` es el evento nativo al soltar; sin él, Konva cortó el arrastre por su cuenta. */
  onGuestDragEnd: (guestId: string, stage: Konva.Stage | null, evt: Event | undefined) => void;
};

/** Opciones de las sillas de una mesa que vienen del editor. */
export type SeatOptions = {
  tableId: string;
  view?: TableSeatView;
  handlers?: SeatHandlers;
  /** Zoom suficiente para leer iniciales; si no, solo colores y el anillo de ocupación. */
  detail: boolean;
  /** Se puede arrastrar a un invitado de una silla a otra mesa. */
  draggable: boolean;
  /** Rotación de la mesa, para que las iniciales queden derechas. */
  rotation: number;
};

/**
 * Sillas de una mesa: vacías (color de silla) u ocupadas (color del grupo + iniciales). Tocar una
 * silla abre la hoja para sentar a alguien; arrastrar una ocupada cambia al invitado de mesa.
 */
export const TableSeats = memo(function TableSeats({
  points,
  radius,
  stroke,
  options,
}: {
  points: SeatPoint[];
  radius: number;
  stroke?: string;
  options?: SeatOptions;
}) {
  const { palette } = usePlanTheme();
  const draggingGuestId = useGuestSeatingStore((s) => s.draggingGuestId);
  const handlers = options?.handlers;
  const fontSize = radius * 0.78;
  const click = (i: number) => options && handlers?.onSeatClick(options.tableId, i);

  return (
    <>
      {points.map((seat, i) => {
        const occupant = options?.view?.seats[i] ?? null;
        const canDrag = !!occupant && !!options?.draggable && !!options.detail;
        // Si a media arrastre cambia el zoom o se pulsa Espacio, la silla sigue siendo arrastrable:
        // al quitarle `draggable`, Konva terminaría el arrastre y lo sentaría donde esté el cursor.
        const dragging = !!occupant && draggingGuestId === occupant.guestId;
        return (
          <Group
            key={i}
            x={seat.x}
            y={seat.y}
            listening={!!handlers}
            draggable={canDrag || dragging}
            onClick={(e) => {
              if ("button" in e.evt && e.evt.button !== 0) return;
              e.cancelBubble = true;
              click(i);
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              click(i);
            }}
            onMouseEnter={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = canDrag ? "grab" : "pointer";
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = "";
            }}
            // El arrastre de una silla es del invitado, no de la mesa: no sube al grupo de la mesa.
            onDragStart={(e) => {
              e.cancelBubble = true;
              if (occupant) handlers?.onGuestDragStart(occupant.guestId);
            }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              handlers?.onGuestDragMove(e.target.getStage(), e.evt);
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              const stage = e.target.getStage();
              // La silla vuelve a su lugar; el plano se redibuja con el invitado ya en su mesa nueva.
              e.target.position({ x: seat.x, y: seat.y });
              if (occupant) handlers?.onGuestDragEnd(occupant.guestId, stage, e.evt);
            }}
          >
            <Circle
              radius={radius}
              fill={occupant ? occupant.color : palette.chair}
              stroke={occupant ? palette.table : (stroke ?? palette.tableLine)}
              strokeWidth={1.2}
              perfectDrawEnabled={false}
            />
            {occupant && options?.detail && (
              <Text
                text={occupant.label}
                width={radius * 2}
                height={radius * 2}
                offsetX={radius}
                offsetY={radius}
                rotation={-options.rotation}
                align="center"
                verticalAlign="middle"
                fontSize={fontSize}
                fontFamily={palette.bodyFont}
                fontStyle="bold"
                fill={palette.onSeat}
                listening={false}
                perfectDrawEnabled={false}
              />
            )}
          </Group>
        );
      })}
    </>
  );
});

/**
 * "6/8" en la mesa. Al alejar el zoom (sin iniciales) se agranda y, en mesas redondas, va con
 * un anillo de ocupación; en rectangulares, con una barra. En rojo si la mesa se pasa.
 */
export function TableOccupancy({
  view,
  detail,
  round,
  width,
  height,
}: {
  view?: TableSeatView;
  detail: boolean;
  round: boolean;
  width: number;
  height: number;
}) {
  const { palette } = usePlanTheme();
  if (!view || view.capacity <= 0) return null;
  const over = view.occupied > view.capacity;
  const color = over ? palette.bad : view.occupied === view.capacity ? palette.g2 : palette.accent;
  const fraction = Math.min(1, view.occupied / view.capacity);
  const fontSize = detail ? 10 : Math.max(12, Math.min(width, height) * 0.22);
  const ring = Math.max(3, Math.min(width, height) * 0.06);

  return (
    <>
      {!detail && round && (
        <>
          <Circle radius={width / 2 - ring / 2 - 1} stroke={palette.tableLine} strokeWidth={ring} listening={false} />
          <Arc
            innerRadius={width / 2 - ring - 1}
            outerRadius={width / 2 - 1}
            angle={360 * fraction}
            rotation={-90}
            fill={color}
            listening={false}
          />
        </>
      )}
      {!detail && !round && (
        <>
          <Rect x={-width / 2 + 4} y={height / 2 - ring - 3} width={width - 8} height={ring} fill={palette.tableLine} cornerRadius={ring / 2} listening={false} />
          <Rect
            x={-width / 2 + 4}
            y={height / 2 - ring - 3}
            width={(width - 8) * fraction}
            height={ring}
            fill={color}
            cornerRadius={ring / 2}
            listening={false}
          />
        </>
      )}
      <Text
        text={`${view.occupied}/${view.capacity}`}
        width={width}
        offsetX={width / 2}
        y={detail ? 9 : 2}
        align="center"
        fontSize={fontSize}
        fontFamily={palette.bodyFont}
        fontStyle={detail ? "normal" : "bold"}
        fill={over ? palette.bad : detail ? palette.muted : palette.ink}
        listening={false}
      />
    </>
  );
}
