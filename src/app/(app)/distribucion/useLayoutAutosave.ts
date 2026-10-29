"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { saveLayout } from "@/app/(app)/distribucion/actions";
import { useCanvasStore } from "@/app/(app)/distribucion/canvasStore";
import { MAX_ROOM_FIXTURES } from "@/lib/roomFixtures";
import { MAX_LAYOUT_ELEMENTS } from "@/lib/seatGeometry";

const AUTOSAVE_DELAY_MS = 800;

/** Lo que se manda al servidor, tomado del store en el momento de pedir el guardado. */
function takeSaveJob() {
  const s = useCanvasStore.getState();
  return {
    revision: s.revision,
    elements: s.elements,
    canvasWidth: s.canvasWidth,
    canvasHeight: s.canvasHeight,
    background: s.background,
    roomShape: s.roomShape,
    roomFixtures: s.roomFixtures,
    pxPerMeter: s.pxPerMeter,
  };
}

type SaveJob = ReturnType<typeof takeSaveJob>;

/**
 * Autoguardado del layout de un evento. Los guardados van de uno en uno (nunca dos en vuelo):
 * si se pide otro mientras hay uno en curso, se guarda después el estado más reciente, así una
 * respuesta lenta no pisa un cambio más nuevo. Solo se marca "Guardado" si no hubo cambios
 * mientras tanto (revisión del store). Si falla, queda en "error" con los cambios pendientes.
 * Devuelve `save` para guardar ya (Ctrl+S, botón, reintentar); su promesa termina cuando ya no
 * queda nada en vuelo (sirve para guardar el plano antes de sentar a alguien en una mesa nueva).
 */
export function useLayoutAutosave(eventId: string, enabled: boolean) {
  const dirty = useCanvasStore((s) => s.dirty);
  const revision = useCanvasStore((s) => s.revision);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const queued = useRef<SaveJob | null>(null);
  const running = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (first: SaveJob) => {
      inFlight.current = true;
      // Al desmontar (cambio de evento) el store ya es de otro evento: no se toca su estado.
      const store = () => (mounted.current ? useCanvasStore.getState() : null);
      let job: SaveJob | null = first;
      try {
        while (job) {
          store()?.setSaveStatus("saving");
          const result = await saveLayout(
            eventId,
            job.elements,
            job.canvasWidth,
            job.canvasHeight,
            job.background,
            job.roomShape,
            job.roomFixtures,
            job.pxPerMeter
          );
          store()?.markClean(job.revision);
          if (result?.droppedElements) {
            toast.warning(`Solo se guardaron ${MAX_LAYOUT_ELEMENTS} elementos; se descartaron ${result.droppedElements}.`);
          }
          if (result?.droppedFixtures) {
            toast.warning(`Solo se guardaron ${MAX_ROOM_FIXTURES} elementos del salón; se descartaron ${result.droppedFixtures}.`);
          }
          job = queued.current;
          queued.current = null;
        }
      } catch (error) {
        console.error("No se pudo guardar la distribución", error);
        queued.current = null;
        const s = store();
        if (s) {
          // dirty sigue en true: el próximo cambio (o "Reintentar") lo vuelve a intentar.
          s.setSaveStatus("error");
          toast.error("No se pudo guardar la distribución. Revisa tu conexión y vuelve a intentar.");
        }
      } finally {
        inFlight.current = false;
      }
    },
    [eventId]
  );

  const save = useCallback((): Promise<void> => {
    const job = takeSaveJob();
    if (inFlight.current) {
      // El guardado en curso toma este estado al terminar (mismo bucle, misma promesa).
      queued.current = job;
      return running.current;
    }
    running.current = run(job);
    return running.current;
  }, [run]);

  // Cada cambio (nueva revisión) reprograma el guardado.
  useEffect(() => {
    if (!enabled || !dirty) return;
    const timeout = setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [enabled, dirty, revision, save]);

  // Al cambiar de evento (o salir de la página dentro de la app) se guarda lo pendiente.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);
  useEffect(() => {
    if (!enabled) return;
    return () => {
      if (useCanvasStore.getState().dirty) void saveRef.current();
    };
  }, [enabled]);

  // Cerrar o recargar la pestaña con cambios sin guardar: el navegador pide confirmación.
  useEffect(() => {
    if (!enabled) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!useCanvasStore.getState().dirty && !inFlight.current) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [enabled]);

  return save;
}
