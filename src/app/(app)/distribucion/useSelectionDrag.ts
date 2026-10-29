"use client";

import { useCallback, useMemo, useRef } from "react";
import type Konva from "konva";
import { snapContext, useCanvasStore } from "@/app/(app)/distribucion/canvasStore";
import { computeSnap, nearestGap, shapeBox, translateBox, unionBox, type Box } from "@/lib/layoutGeometry";
import { metersToPx } from "@/lib/layoutUnits";

// Umbral de las guías en píxeles de PANTALLA (se divide entre el zoom): se siente igual a cualquier zoom.
const SNAP_SCREEN_PX = 8;
// La distancia al vecino solo se muestra si está a menos de esto.
const MAX_GAP_METERS = 6;

type DragSession = {
  leadId: string;
  starts: Map<string, { x: number; y: number }>;
  box: Box;
  targets: Box[];
  maxGap: number;
};

// Cancela el arrastre en curso (de cualquier capa): solo puede haber uno a la vez.
let cancelActiveDrag: (() => void) | null = null;

/**
 * Descarta el arrastre de elementos en curso (p. ej. al empezar un pellizco con dos dedos): los
 * devuelve a donde estaban y suelta el arrastre de Konva sin guardar nada.
 */
export function cancelSelectionDrag(stage: Konva.Stage) {
  cancelActiveDrag?.();
  for (const node of stage.find((n: Konva.Node) => n.isDragging())) node.stopDrag();
}

export type DragHandlers = {
  onDragStart: (id: string) => void;
  onDragMove: (id: string, node: Konva.Node, evt: MouseEvent | TouchEvent | PointerEvent) => void;
  onDragEnd: (id: string) => void;
};

/**
 * Arrastre de la selección de la capa activa (mesas o elementos fijos): mueve todos los
 * seleccionados juntos, los alinea con los demás (guías inteligentes; Alt las desactiva),
 * muestra la distancia al vecino más cercano y guarda todo el arrastre como UN paso del historial.
 *
 * El primer nodo que empieza a arrastrarse manda ("lead"): el Transformer de Konva arrastra a
 * los demás seleccionados y aquí se les fija la posición relativa al lead, ya ajustada.
 */
export function useSelectionDrag(nodeRefs: React.RefObject<Map<string, Konva.Group>>): DragHandlers {
  const session = useRef<DragSession | null>(null);

  const placeFollowers = useCallback(
    (s: DragSession, dx: number, dy: number) => {
      for (const [id, start] of s.starts) {
        if (id === s.leadId) continue;
        nodeRefs.current.get(id)?.position({ x: start.x + dx, y: start.y + dy });
      }
    },
    [nodeRefs]
  );

  const onDragStart = useCallback((id: string) => {
    if (session.current) return; // los nodos que arrastra el Transformer también avisan
    const store = useCanvasStore.getState();
    let ids = store.selectedIds;
    if (!ids.includes(id)) {
      ids = [id];
      store.setSelection(ids);
    }
    const selected = new Set(ids);
    const { pxPerMeter, active, extra } = snapContext(store);
    const moving = active.filter((s) => selected.has(s.id));
    const box = unionBox(moving.map(shapeBox));
    if (!box) return;
    session.current = {
      leadId: id,
      starts: new Map(moving.map((s) => [s.id, { x: s.x, y: s.y }])),
      box,
      targets: [...active.filter((s) => !selected.has(s.id)), ...extra].map(shapeBox),
      maxGap: metersToPx(MAX_GAP_METERS, pxPerMeter),
    };
    store.breakHistoryGroup();
    store.setInteracting(true);
    cancelActiveDrag = () => {
      const s = session.current;
      session.current = null;
      cancelActiveDrag = null;
      if (s) for (const [itemId, start] of s.starts) nodeRefs.current.get(itemId)?.position(start);
      const st = useCanvasStore.getState();
      st.setSnapGuides(null);
      st.setInteracting(false);
    };
  }, [nodeRefs]);

  const onDragMove = useCallback(
    (id: string, node: Konva.Node, evt: MouseEvent | TouchEvent | PointerEvent) => {
      const s = session.current;
      if (!s) return;
      const leadStart = s.starts.get(s.leadId)!;
      if (id !== s.leadId) {
        // Seguidor: misma traslación que el lead (ya ajustada a las guías).
        const lead = nodeRefs.current.get(s.leadId);
        const start = s.starts.get(id);
        if (lead && start) node.position({ x: start.x + lead.x() - leadStart.x, y: start.y + lead.y() - leadStart.y });
        return;
      }
      const store = useCanvasStore.getState();
      let dx = node.x() - leadStart.x;
      let dy = node.y() - leadStart.y;
      const snapOff = "altKey" in evt && evt.altKey;
      const snap = snapOff
        ? { dx: 0, dy: 0, guides: [] }
        : computeSnap(translateBox(s.box, dx, dy), s.targets, SNAP_SCREEN_PX / store.zoom);
      dx += snap.dx;
      dy += snap.dy;
      node.position({ x: leadStart.x + dx, y: leadStart.y + dy });
      placeFollowers(s, dx, dy);
      store.setSnapGuides({ lines: snap.guides, gap: nearestGap(translateBox(s.box, dx, dy), s.targets, s.maxGap) });
    },
    [nodeRefs, placeFollowers]
  );

  const onDragEnd = useCallback(
    (id: string) => {
      const s = session.current;
      if (!s || id !== s.leadId) return;
      session.current = null;
      cancelActiveDrag = null;
      const store = useCanvasStore.getState();
      store.setSnapGuides(null);
      store.setInteracting(false);
      const lead = nodeRefs.current.get(s.leadId);
      const leadStart = s.starts.get(s.leadId)!;
      if (!lead) return;
      const dx = lead.x() - leadStart.x;
      const dy = lead.y() - leadStart.y;
      placeFollowers(s, dx, dy);
      if (dx === 0 && dy === 0) return;
      store.updateItems([...s.starts].map(([itemId, start]) => ({ id: itemId, x: start.x + dx, y: start.y + dy })));
    },
    [nodeRefs, placeFollowers]
  );

  return useMemo(() => ({ onDragStart, onDragMove, onDragEnd }), [onDragStart, onDragMove, onDragEnd]);
}

/**
 * Fin de un redimensionado/rotación con el Transformer (uno o varios nodos): pasa la escala de
 * cada nodo a width/height y lo guarda todo como un solo paso del historial.
 */
export function commitTransform(
  transformer: Konva.Transformer,
  sizeOf: (id: string) => { width: number; height: number; round?: boolean } | undefined,
  minSize: number
) {
  const updates = transformer.nodes().flatMap((node) => {
    const id = node.id();
    const size = sizeOf(id);
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    if (!size) return [];
    let width = Math.max(minSize, size.width * scaleX);
    let height = Math.max(minSize, size.height * scaleY);
    // Las figuras redondas se dibujan con radio width/2: ancho y alto siempre iguales.
    if (size.round) width = height = Math.max(width, height);
    return [{ id, x: node.x(), y: node.y(), rotation: node.rotation(), width, height }];
  });
  useCanvasStore.getState().updateItems(updates);
}

/**
 * Tamaño de las manijas del Transformer: con el dedo (puntero "coarse") se agrandan para que se
 * puedan tomar; con el mouse quedan discretas.
 */
export function transformerHandleProps(coarsePointer: boolean) {
  return coarsePointer
    ? { anchorSize: 22, anchorCornerRadius: 6, rotateAnchorOffset: 64 }
    : { anchorSize: 9, anchorCornerRadius: 2, rotateAnchorOffset: 50 };
}
