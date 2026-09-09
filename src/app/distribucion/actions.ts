"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrCreateSeatingLayout } from "@/lib/seatingLayout";
import { isChairBlock, isTableType, type ElementType } from "@/lib/seatGeometry";
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

export async function saveLayout(
  eventId: string,
  elements: LayoutElement[],
  canvasWidth: number,
  canvasHeight: number,
  background: string
) {
  const layout = await getOrCreateSeatingLayout(eventId);
  const sanitized = elements.map(sanitizeElement).filter((el): el is LayoutElement => el !== null);

  await prisma.seatingLayout.update({
    where: { id: layout.id },
    data: {
      elements: sanitized,
      canvasWidth: clamp(canvasWidth, 800, 4000),
      canvasHeight: clamp(canvasHeight, 800, 4000),
      background: background === "garden" ? "garden" : "indoor",
    },
  });

  revalidatePath("/distribucion");
  revalidatePath("/invitados");
}
