import {
  ArrowLeftRight,
  Bath,
  Cake,
  Camera,
  Church,
  Circle,
  Disc3,
  DoorOpen,
  Footprints,
  Heart,
  Mic,
  RectangleHorizontal,
  type LucideIcon,
} from "lucide-react";

export type ElementType =
  | "table-round"
  | "table-rectangular"
  | "table-sweetheart"
  | "table-cake"
  | "chair-row"
  | "stage"
  | "dance-floor"
  | "photo-area"
  | "altar"
  | "aisle"
  | "entrance"
  | "restroom"
  | "hallway";

export type SeatPoint = { x: number; y: number; rotation: number };

const SEAT_OFFSET = 20;

/** Puntos de silla alrededor de una mesa, relativos al centro del elemento (0,0). */
export function computeSeatPositions(
  type: "table-round" | "table-rectangular" | "table-sweetheart",
  width: number,
  height: number,
  capacity: number
): SeatPoint[] {
  if (capacity <= 0) return [];

  if (type === "table-round") {
    const radius = width / 2 + SEAT_OFFSET;
    return Array.from({ length: capacity }, (_, i) => {
      const angle = (2 * Math.PI * i) / capacity - Math.PI / 2;
      return {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
        rotation: (angle * 180) / Math.PI + 90,
      };
    });
  }

  const topCount = Math.ceil(capacity / 2);
  const bottomCount = Math.floor(capacity / 2);
  const topY = -height / 2 - SEAT_OFFSET;
  const bottomY = height / 2 + SEAT_OFFSET;
  const points: SeatPoint[] = [];
  for (let i = 0; i < topCount; i++) {
    points.push({ x: -width / 2 + (width * (i + 1)) / (topCount + 1), y: topY, rotation: 180 });
  }
  for (let i = 0; i < bottomCount; i++) {
    points.push({ x: -width / 2 + (width * (i + 1)) / (bottomCount + 1), y: bottomY, rotation: 0 });
  }
  return points;
}

/** Cuadrícula de sillas para el bloque "chair-row" (ceremonia), centrada en (0,0). */
export function computeChairGridPositions(width: number, height: number, rows: number, columns: number): SeatPoint[] {
  const points: SeatPoint[] = [];
  const rowGap = rows > 1 ? height / (rows - 1) : 0;
  const colGap = columns > 1 ? width / (columns - 1) : 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      points.push({
        x: columns > 1 ? -width / 2 + c * colGap : 0,
        y: rows > 1 ? -height / 2 + r * rowGap : 0,
        rotation: 0,
      });
    }
  }
  return points;
}

export const ELEMENT_LABELS: Record<ElementType, string> = {
  "table-round": "Mesa redonda",
  "table-rectangular": "Mesa rectangular",
  "table-sweetheart": "Mesa de novios",
  "table-cake": "Mesa del pastel",
  "chair-row": "Filas de sillas",
  stage: "Escenario / Músicos",
  "dance-floor": "Pista de baile",
  "photo-area": "Área de fotos",
  altar: "Altar",
  aisle: "Camino al altar",
  entrance: "Entrada",
  restroom: "Baño",
  hallway: "Pasillo",
};

export const ELEMENT_ICONS: Record<ElementType, LucideIcon> = {
  "table-round": Circle,
  "table-rectangular": RectangleHorizontal,
  "table-sweetheart": Heart,
  "table-cake": Cake,
  "chair-row": RectangleHorizontal,
  stage: Mic,
  "dance-floor": Disc3,
  "photo-area": Camera,
  altar: Church,
  aisle: Footprints,
  entrance: DoorOpen,
  restroom: Bath,
  hallway: ArrowLeftRight,
};

// Emoji para dibujar dentro del canvas de Konva (Text nativo: rápido y síncrono, sin
// cargar ninguna imagen). Los íconos de lucide-react (ELEMENT_ICONS) se usan solo en la
// UI normal del DOM (barra de herramientas, panel de propiedades), donde no hay costo.
export const ELEMENT_EMOJI: Record<ElementType, string> = {
  "table-round": "⭕",
  "table-rectangular": "▭",
  "table-sweetheart": "💕",
  "table-cake": "🎂",
  "chair-row": "🪑",
  stage: "🎻",
  "dance-floor": "💃",
  "photo-area": "📸",
  altar: "⛪",
  aisle: "🌿",
  entrance: "🚪",
  restroom: "🚻",
  hallway: "↔️",
};

type ZoneStyle = { fill: string; iconColor: string };

/** Estilo (relleno + color de ícono) para los tipos que se dibujan como "zona" con ZoneShape. */
export const ZONE_STYLES: Partial<Record<ElementType, ZoneStyle>> = {
  "table-cake": { fill: "#fbe9f2", iconColor: "#a8415c" },
  stage: { fill: "#efe6f7", iconColor: "#6d4a96" },
  "dance-floor": { fill: "#e3f1f7", iconColor: "#2c7a9e" },
  "photo-area": { fill: "#fbe6ec", iconColor: "#a8415c" },
  altar: { fill: "#f3ede3", iconColor: "#8a6a3a" },
  aisle: { fill: "#f0ead9", iconColor: "#a68a4a" },
  entrance: { fill: "#e6f0e8", iconColor: "#3a7a52" },
  restroom: { fill: "#e8eef4", iconColor: "#3a5a8a" },
  hallway: { fill: "#eee9e2", iconColor: "#6a5a4a" },
};

const TABLE_TYPES: ElementType[] = ["table-round", "table-rectangular", "table-sweetheart"];
const ZONE_TYPES: ElementType[] = [
  "table-cake",
  "stage",
  "dance-floor",
  "photo-area",
  "altar",
  "aisle",
  "entrance",
  "restroom",
  "hallway",
];

export function isTableType(type: ElementType | string): boolean {
  return TABLE_TYPES.includes(type as ElementType);
}

export function isChairBlock(type: ElementType | string): boolean {
  return type === "chair-row";
}

export function isZoneType(type: ElementType | string): boolean {
  return ZONE_TYPES.includes(type as ElementType);
}

type DefaultElementShape = {
  width: number;
  height: number;
  capacity: number | null;
  rows: number | null;
  columns: number | null;
};

export function getDefaultElementShape(type: ElementType): DefaultElementShape {
  switch (type) {
    case "table-round":
      return { width: 100, height: 100, capacity: 8, rows: null, columns: null };
    case "table-rectangular":
      return { width: 160, height: 80, capacity: 8, rows: null, columns: null };
    case "table-sweetheart":
      return { width: 120, height: 60, capacity: 2, rows: null, columns: null };
    case "table-cake":
      return { width: 70, height: 70, capacity: null, rows: null, columns: null };
    case "chair-row":
      return { width: 240, height: 150, capacity: 24, rows: 4, columns: 6 };
    case "stage":
      return { width: 220, height: 120, capacity: null, rows: null, columns: null };
    case "dance-floor":
      return { width: 200, height: 200, capacity: null, rows: null, columns: null };
    case "photo-area":
      return { width: 140, height: 140, capacity: null, rows: null, columns: null };
    case "altar":
      return { width: 100, height: 60, capacity: null, rows: null, columns: null };
    case "aisle":
      return { width: 80, height: 260, capacity: null, rows: null, columns: null };
    case "entrance":
      return { width: 80, height: 50, capacity: null, rows: null, columns: null };
    case "restroom":
      return { width: 70, height: 70, capacity: null, rows: null, columns: null };
    case "hallway":
      return { width: 260, height: 70, capacity: null, rows: null, columns: null };
  }
}

export const TOOL_GROUPS: { label: string; types: ElementType[] }[] = [
  { label: "Mesas", types: ["table-round", "table-rectangular", "table-sweetheart", "table-cake"] },
  { label: "Ceremonia", types: ["chair-row", "altar", "aisle"] },
  { label: "Recepción", types: ["stage", "dance-floor", "photo-area"] },
  { label: "Edificio", types: ["entrance", "hallway", "restroom"] },
];
