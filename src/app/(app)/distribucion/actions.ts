"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrCreateSeatingLayout } from "@/lib/seatingLayout";
import { getEditableWeddingId } from "@/lib/wedding";
import { audit } from "@/lib/audit";
import { isChairBlock, isTableType, type ElementType, type RoomPoint } from "@/lib/seatGeometry";
import type { LayoutElement } from "@/generated/prisma";

const VALID_TYPES: ElementType[] = [
  "table-round",
  "table-rectangular",
  "table-sweetheart",
  "table-cake",
  "chair-row",
  "stage",
  "dance-floor",
  "photo-area",
  "altar",
  "aisle",
  "entrance",
  "restroom",
  "hallway",
];

const MIN_SIZE = 20;
const MAX_SIZE = 900;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeElement(raw: LayoutElement): LayoutElement | null {
  if (!raw.id || !VALID_TYPES.includes(raw.type as ElementType)) return null;

  const type = raw.type as ElementType;
  const isTable = isTableType(type);
  const isChairs = isChairBlock(type);

  return {
    id: raw.id,
    type,
    label: String(raw.label ?? "").slice(0, 60),
    tableNumber: isTable ? Number(raw.tableNumber ?? 0) : null,
    x: Number.isFinite(raw.x) ? raw.x : 0,
    y: Number.isFinite(raw.y) ? raw.y : 0,
    width: clamp(Number(raw.width) || MIN_SIZE, MIN_SIZE, MAX_SIZE),
    height: clamp(Number(raw.height) || MIN_SIZE, MIN_SIZE, MAX_SIZE),
    rotation: Number.isFinite(raw.rotation) ? raw.rotation : 0,
    capacity: isTable ? Math.max(1, Number(raw.capacity) || 1) : isChairs ? Number(raw.capacity) || 0 : null,
    rows: isChairs ? clamp(Number(raw.rows) || 1, 1, 20) : null,
    columns: isChairs ? clamp(Number(raw.columns) || 1, 1, 20) : null,
    fill: raw.fill ?? null,
    zIndex: Number.isFinite(raw.zIndex) ? raw.zIndex : 0,
  };
}

function sanitizeRoomShape(points: RoomPoint[]): RoomPoint[] {
  if (!Array.isArray(points) || points.length < 3) return [];
  return points
    .filter((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y))
    .map((p) => ({ x: clamp(p.x, -2000, 6000), y: clamp(p.y, -2000, 6000) }));
}

export async function saveLayout(
  eventId: string,
  elements: LayoutElement[],
  canvasWidth: number,
  canvasHeight: number,
  background: string,
  roomShape: RoomPoint[] = []
) {
  const weddingId = await getEditableWeddingId();
  const layout = await getOrCreateSeatingLayout(eventId);
  const sanitized = elements.map(sanitizeElement).filter((el): el is LayoutElement => el !== null);
  const sanitizedRoomShape = sanitizeRoomShape(roomShape);

  await prisma.seatingLayout.update({
    where: { id: layout.id },
    data: {
      elements: sanitized,
      canvasWidth: clamp(canvasWidth, 800, 4000),
      canvasHeight: clamp(canvasHeight, 800, 4000),
      background: background === "garden" ? "garden" : "indoor",
      roomShape: sanitizedRoomShape.length >= 3 ? sanitizedRoomShape : [],
    },
  });

  // Se autoguarda en cada cambio: un evento cada 10 minutos por salón basta.
  await audit("layout.save", "Editó la distribución del salón", { weddingId, targetId: eventId, dedupeMinutes: 10 });

  revalidatePath("/distribucion");
  revalidatePath("/invitados");
}
