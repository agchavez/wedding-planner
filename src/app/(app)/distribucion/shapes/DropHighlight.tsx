import { Circle, Group, Rect } from "react-konva";
import { useCanvasStore } from "@/app/(app)/distribucion/canvasStore";
import { useGuestSeatingStore } from "@/app/(app)/distribucion/guestSeatingStore";
import { usePlanTheme } from "@/app/(app)/distribucion/planPalette";
import { isSameSeat, planSeat, seatWorldPosition } from "@/lib/guestSeating";
import { getElementFootprint } from "@/lib/seatGeometry";

/**
 * Marca la mesa o la silla donde caería el invitado que se arrastra: en el color de acento si
 * se puede sentar ahí, en rojo si la mesa no tiene lugar para todo su grupo o la silla es de otro.
 */
export function DropHighlight({ pxPerMeter }: { pxPerMeter: number }) {
  const { palette } = usePlanTheme();
  const target = useGuestSeatingStore((s) => s.dropTarget);
  const guests = useGuestSeatingStore((s) => s.guests);
  const draggingId = useGuestSeatingStore((s) => s.draggingGuestId);
  const table = useCanvasStore((s) => (target ? s.elements.find((el) => el.id === target.tableId) : undefined));
  if (!target || !table) return null;

  // Misma validación que al soltar (seatGuestAt).
  const dragging = guests.find((g) => g.id === draggingId);
  const tableGuests = guests.filter((g) => g.tableElementId === table.id);
  const fits =
    !dragging ||
    isSameSeat(table.capacity, tableGuests, dragging.id, target.seatIndex) ||
    planSeat(table.capacity, tableGuests.filter((g) => g.id !== dragging.id), dragging, target.seatIndex).ok;
  const color = fits ? palette.accent : palette.bad;

  if (target.seatIndex !== null) {
    const seat = seatWorldPosition(table, target.seatIndex, pxPerMeter);
    if (seat) {
      return <Circle x={seat.x} y={seat.y} radius={seat.radius + 4} stroke={color} strokeWidth={2.5} listening={false} />;
    }
  }
  const footprint = getElementFootprint(table, pxPerMeter);
  return (
    <Group x={table.x} y={table.y} rotation={table.rotation} listening={false}>
      {footprint.round ? (
        <Circle radius={footprint.width / 2 + 4} stroke={color} strokeWidth={2.2} />
      ) : (
        <Rect
          x={-footprint.width / 2 - 4}
          y={-footprint.height / 2 - 4}
          width={footprint.width + 8}
          height={footprint.height + 8}
          stroke={color}
          strokeWidth={2.2}
          cornerRadius={6}
        />
      )}
    </Group>
  );
}
