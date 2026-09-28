"use client";

import dynamic from "next/dynamic";
import type { Background } from "@/app/(app)/distribucion/canvasStore";
import type { RoomPoint } from "@/lib/seatGeometry";
import type { LayoutElement } from "@/generated/prisma";

const SeatingEditor = dynamic(
  () => import("@/app/(app)/distribucion/SeatingEditor").then((mod) => mod.SeatingEditor),
  {
    ssr: false,
    loading: () => (
      <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Cargando editor de distribución...
      </p>
    ),
  }
);

export function SeatingEditorLoader(props: {
  eventId: string;
  initialElements: LayoutElement[];
  canvasWidth: number;
  canvasHeight: number;
  initialBackground: Background;
  initialRoomShape: RoomPoint[];
}) {
  return <SeatingEditor {...props} />;
}
