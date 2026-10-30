"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  BookmarkPlus,
  ChevronDown,
  Globe2,
  ImageUp,
  Library,
  Loader2,
  Lock,
  Ruler,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useCanvasStore } from "@/app/(app)/distribucion/canvasStore";
import { useGuestSeatingStore } from "@/app/(app)/distribucion/guestSeatingStore";
import { currentLibrarySession, endLibrarySession, useRoomLibraryStore } from "@/app/(app)/distribucion/roomLibraryStore";
import { RoomPreview } from "@/app/(app)/distribucion/RoomPreview";
import { listLibraryRooms, saveRoomToLibrary, uploadFloorPlan, getLibraryRoomVersion } from "@/app/(app)/distribucion/library-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDimensions, resolvePxPerMeter } from "@/lib/layoutUnits";
import {
  banquetCapacityStatus,
  findRoomConflicts,
  fitPlanImage,
  hasRoomContent,
  scaledRoomLayerIssue,
  scaleRoomLayer,
  seatedPeople,
  type BaseRoomInfo,
  type LibraryRoom,
  type RoomLayer,
} from "@/lib/venueLibrary";

// Los diálogos de la biblioteca pueden ser más altos que la pantalla (móvil, teclado abierto):
// nunca pasan del alto visible y su contenido se desplaza por dentro.
const SCROLLABLE_DIALOG = "max-h-[calc(100svh-2rem)] overflow-y-auto";

/** Capa salón actual del editor, en su escala efectiva. */
function currentLayer(): RoomLayer {
  const s = useCanvasStore.getState();
  return {
    roomShape: s.roomShape,
    roomFixtures: s.roomFixtures,
    pxPerMeter: resolvePxPerMeter(s.pxPerMeter),
    canvasWidth: s.canvasWidth,
    canvasHeight: s.canvasHeight,
    background: s.background,
    backgroundImage: s.backgroundImage,
  };
}

function infoFromRoom(room: LibraryRoom): BaseRoomInfo | null {
  if (!room.latest) return null;
  return {
    versionId: room.latest.id,
    version: room.latest.version,
    roomId: room.id,
    roomName: room.name,
    venueName: room.venue.name,
    banquetCapacity: room.banquetCapacity,
    latestVersionId: room.latest.id,
    latestVersion: room.latest.version,
  };
}

/** Tamaño natural de una imagen (para encajar el plano en el lienzo). */
function loadImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("No se pudo cargar la imagen."));
    img.src = url;
  });
}

/** Menú "Biblioteca de salones" de la barra superior del editor. */
export function RoomLibraryMenu() {
  const openDialog = useRoomLibraryStore((s) => s.openDialog);
  const startCalibration = useCanvasStore((s) => s.startCalibration);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <Library className="size-3.5" />
        Biblioteca de salones
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => openDialog("picker")}>
          <Library className="size-4" />
          Usar un salón de la biblioteca…
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openDialog("save")}>
          <BookmarkPlus className="size-4" />
          Guardar salón en la biblioteca…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => openDialog("plan")}>
          <ImageUp className="size-4" />
          Importar plano…
        </DropdownMenuItem>
        <DropdownMenuItem onClick={startCalibration}>
          <Ruler className="size-4" />
          Calibrar escala con dos puntos
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Salón de la biblioteca en que se basa el plano, aviso de versión nueva y aforo de banquete
 * frente a las personas sentadas (aviso, nunca bloquea).
 */
export function RoomLibraryStatus({ canEdit }: { canEdit: boolean }) {
  const baseRoomVersionId = useCanvasStore((s) => s.baseRoomVersionId);
  const info = useRoomLibraryStore((s) => (baseRoomVersionId ? s.known[baseRoomVersionId] : undefined));
  const setReview = useRoomLibraryStore((s) => s.setReview);
  const tables = useCanvasStore((s) => s.elements);
  const guests = useGuestSeatingStore((s) => s.guests);
  const [loading, startLoading] = useTransition();
  if (!info) return null;

  const capacity = banquetCapacityStatus(info.banquetCapacity, seatedPeople(tables, guests));
  const updateAvailable = info.latestVersionId !== info.versionId;

  function reviewUpdate() {
    const session = currentLibrarySession();
    const linkedTo = baseRoomVersionId;
    startLoading(async () => {
      const data = await getLibraryRoomVersion(info!.latestVersionId);
      // Si mientras tanto se cambió de evento (o de salón base), la revisión ya no es de este plano.
      if (session !== currentLibrarySession() || useCanvasStore.getState().baseRoomVersionId !== linkedTo) return;
      if (!data) {
        toast.error("No se pudo cargar la versión nueva del salón.");
        return;
      }
      setReview({ mode: "update", data, info: data.info });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 font-medium">
        <Library className="size-3.5 text-muted-foreground" />
        {info.venueName} · {info.roomName}
        <span className="font-normal text-muted-foreground">v{info.version}</span>
      </span>
      {capacity && (
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1",
            capacity.over ? "bg-amber-500/15 text-amber-800 dark:text-amber-300" : "bg-muted text-muted-foreground"
          )}
          title={capacity.message}
        >
          {capacity.over ? <AlertTriangle className="size-3.5" /> : <Users className="size-3.5" />}
          {capacity.over ? capacity.message : `Aforo banquete: ${capacity.seated} / ${capacity.capacity}`}
        </span>
      )}
      {updateAvailable && (
        <span className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 py-0.5 pr-0.5 pl-2.5 text-amber-900 dark:text-amber-200">
          Hay una versión nueva del salón (v{info.latestVersion})
          {canEdit && (
            <Button size="xs" variant="outline" onClick={reviewUpdate} disabled={loading}>
              {loading && <Loader2 className="size-3 animate-spin" />}
              Revisar y actualizar
            </Button>
          )}
        </span>
      )}
    </div>
  );
}

/** Diálogos de la biblioteca (solo para quien puede editar la boda). */
export function RoomLibraryDialogs() {
  const dialog = useRoomLibraryStore((s) => s.dialog);
  const openDialog = useRoomLibraryStore((s) => s.openDialog);
  const close = (open: boolean) => !open && openDialog(null);

  // Al salir del editor (o cambiar de evento) no queda ningún diálogo abierto para el siguiente, y
  // las respuestas que lleguen después se descartan.
  useEffect(() => endLibrarySession, []);

  return (
    <>
      <Dialog open={dialog === "picker"} onOpenChange={close}>
        {dialog === "picker" && <LibraryPickerContent />}
      </Dialog>
      <Dialog open={dialog === "save"} onOpenChange={close}>
        {dialog === "save" && <SaveRoomContent />}
      </Dialog>
      <Dialog open={dialog === "plan"} onOpenChange={close}>
        {dialog === "plan" && <FloorPlanContent />}
      </Dialog>
      <RoomReviewDialog />
    </>
  );
}

function useLibraryRooms() {
  const [rooms, setRooms] = useState<LibraryRoom[] | null>(null);
  useEffect(() => {
    let active = true;
    listLibraryRooms()
      .then((list) => active && setRooms(list))
      .catch(() => {
        if (!active) return;
        setRooms([]);
        toast.error("No se pudo cargar la biblioteca de salones.");
      });
    return () => {
      active = false;
    };
  }, []);
  return rooms;
}

function capacityLine(room: LibraryRoom) {
  const parts = [
    room.banquetCapacity && `${room.banquetCapacity} en banquete`,
    room.cocktailCapacity && `${room.cocktailCapacity} en cóctel`,
    room.theaterCapacity && `${room.theaterCapacity} en auditorio`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Capacidad sin declarar";
}

function LibraryPickerContent() {
  const rooms = useLibraryRooms();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const setReview = useRoomLibraryStore((s) => s.setReview);
  const openDialog = useRoomLibraryStore((s) => s.openDialog);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const withVersion = (rooms ?? []).filter((r) => r.latest);
    if (!q) return withVersion;
    return withVersion.filter((r) => [r.name, r.venue.name, r.venue.city].some((t) => t.toLowerCase().includes(q)));
  }, [rooms, query]);
  const selected = visible.find((r) => r.id === selectedId) ?? visible[0] ?? null;

  function chooseRoom(room: LibraryRoom) {
    const info = infoFromRoom(room);
    if (!room.latest || !info) return;
    openDialog(null);
    setReview({ mode: "use", data: room.latest, info });
  }

  return (
    <DialogContent className={cn("sm:max-w-3xl", SCROLLABLE_DIALOG)}>
      <DialogHeader>
        <DialogTitle>Usar un salón de la biblioteca</DialogTitle>
        <DialogDescription>
          Copia el contorno, las paredes, columnas y puertas del salón a este plano. Tus mesas e invitados no se mueven.
        </DialogDescription>
      </DialogHeader>
      {rooms === null ? (
        <p className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Cargando salones…
        </p>
      ) : rooms.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-12 text-center text-muted-foreground">
          Todavía no hay salones en la biblioteca. Dibuja el tuyo y usa «Guardar salón en la biblioteca».
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[16rem_minmax(0,1fr)]">
          <div className="min-w-0 space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar lugar o ciudad" aria-label="Buscar lugar o ciudad" className="pl-8" />
            </div>
            <ul className="max-h-48 space-y-1 overflow-y-auto pr-1 sm:max-h-80" aria-label="Salones">
              {visible.map((room) => (
                <li key={room.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(room.id)}
                    aria-pressed={selected?.id === room.id}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                      selected?.id === room.id ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted"
                    )}
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      {room.venue.visibility === "platform" ? (
                        <Globe2 className="size-3.5 shrink-0 text-primary" />
                      ) : (
                        <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate">{room.venue.name}</span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {room.name}
                      {room.venue.city && ` · ${room.venue.city}`}
                    </span>
                  </button>
                </li>
              ))}
              {visible.length === 0 && <li className="px-3 py-6 text-center text-muted-foreground">Sin resultados.</li>}
            </ul>
          </div>
          {selected?.latest && (
            <div className="min-w-0 space-y-3">
              <div className="aspect-[4/3] overflow-hidden rounded-lg border border-border bg-background p-2">
                <RoomPreview layer={selected.latest} />
              </div>
              <div>
                <p className="font-heading text-lg font-semibold">
                  {selected.venue.name} · {selected.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[selected.venue.city, selected.venue.address].filter(Boolean).join(" · ") || "Sin dirección"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selected.sizeMeters && `${formatDimensions(selected.sizeMeters.width, selected.sizeMeters.height)} · `}
                  {capacityLine(selected)} · versión {selected.latest.version}
                  {selected.venue.visibility === "platform" ? " · de la plataforma" : " · privado"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={() => openDialog(null)}>
          Cancelar
        </Button>
        <Button disabled={!selected?.latest} onClick={() => selected && chooseRoom(selected)}>
          Usar este salón
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

const NEW = "new";

function SaveRoomContent() {
  const rooms = useLibraryRooms();
  const openDialog = useRoomLibraryStore((s) => s.openDialog);
  const remember = useRoomLibraryStore((s) => s.remember);
  const baseRoomVersionId = useCanvasStore((s) => s.baseRoomVersionId);
  const baseInfo = useRoomLibraryStore((s) => (baseRoomVersionId ? s.known[baseRoomVersionId] : undefined));
  const linkBaseRoomVersion = useCanvasStore((s) => s.linkBaseRoomVersion);
  const [saving, startSaving] = useTransition();

  const editableRooms = useMemo(() => (rooms ?? []).filter((r) => r.editable), [rooms]);
  const editableVenues = useMemo(() => {
    const byId = new Map(editableRooms.map((r) => [r.venue.id, r.venue]));
    return [...byId.values()];
  }, [editableRooms]);

  // Por defecto: versión nueva del salón en que se basa el plano (si se puede), si no, salón nuevo.
  const [roomChoice, setRoomChoice] = useState<string | null>(null);
  const defaultRoom = editableRooms.some((r) => r.id === baseInfo?.roomId) ? baseInfo!.roomId : NEW;
  const roomId = roomChoice ?? defaultRoom;
  const [venueId, setVenueId] = useState(NEW);
  const isNewRoom = roomId === NEW;

  function submit(formData: FormData) {
    const field = (name: string) => String(formData.get(name) ?? "");
    const session = currentLibrarySession();
    startSaving(async () => {
      try {
        const result = await saveRoomToLibrary({
          ...(isNewRoom
            ? {
                ...(venueId === NEW
                  ? { venue: { name: field("venueName"), city: field("city"), address: field("address"), notes: field("notes") } }
                  : { venueId }),
                roomName: field("roomName"),
                banquetCapacity: field("banquetCapacity"),
                cocktailCapacity: field("cocktailCapacity"),
                theaterCapacity: field("theaterCapacity"),
              }
            : { roomId }),
          layer: currentLayer(),
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        remember(result.info);
        // Si mientras se guardaba se cambió de evento, el salón queda en la biblioteca pero no se
        // vincula al plano que está abierto ahora.
        if (session !== currentLibrarySession()) {
          toast.success(`Salón guardado en la biblioteca (versión ${result.info.version}).`);
          return;
        }
        linkBaseRoomVersion(result.info.versionId);
        openDialog(null);
        toast.success(`Salón guardado en la biblioteca (versión ${result.info.version}).`);
      } catch {
        toast.error("No se pudo guardar el salón. Vuelve a intentarlo.");
      }
    });
  }

  const empty = !hasRoomContent(currentLayer());

  return (
    <DialogContent className={cn("sm:max-w-lg", SCROLLABLE_DIALOG)}>
      <DialogHeader>
        <DialogTitle>Guardar salón en la biblioteca</DialogTitle>
        <DialogDescription>
          Guarda el contorno, las paredes, columnas, puertas y el plano de fondo para reutilizarlos en otros eventos y bodas.
          Las mesas de esta boda no se guardan.
        </DialogDescription>
      </DialogHeader>
      {rooms === null ? (
        <p className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Cargando…
        </p>
      ) : (
        <form id="save-room-form" action={submit} className="space-y-3">
          {empty && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              El salón está vacío: define la forma del local, agrega paredes o importa un plano primero.
            </p>
          )}
          <div>
            <Label htmlFor="save-room-target">Guardar como</Label>
            <Select value={roomId} onValueChange={(v) => setRoomChoice(String(v))}>
              <SelectTrigger id="save-room-target" className="mt-1 w-full">
                <SelectValue>
                  {(value: string) => {
                    const room = editableRooms.find((r) => r.id === value);
                    return room ? `Versión nueva de ${room.venue.name} · ${room.name}` : "Salón nuevo";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NEW}>Salón nuevo</SelectItem>
                {editableRooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    Versión nueva de {room.venue.name} · {room.name} (hoy v{room.latest?.version ?? 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isNewRoom && (
            <>
              <div>
                <Label htmlFor="save-room-venue">Lugar</Label>
                <Select value={venueId} onValueChange={(v) => setVenueId(String(v))}>
                  <SelectTrigger id="save-room-venue" className="mt-1 w-full">
                    <SelectValue>{(value: string) => editableVenues.find((v) => v.id === value)?.name ?? "Lugar nuevo"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NEW}>Lugar nuevo</SelectItem>
                    {editableVenues.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        {venue.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {venueId === NEW && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="venueName">Nombre del lugar</Label>
                    <Input id="venueName" name="venueName" required maxLength={100} placeholder="Ej. Hacienda Los Almendros" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="city">Ciudad</Label>
                    <Input id="city" name="city" maxLength={80} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="address">Dirección</Label>
                    <Input id="address" name="address" maxLength={200} className="mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="notes">Notas</Label>
                    <Textarea id="notes" name="notes" maxLength={1000} rows={2} className="mt-1" placeholder="Acceso de proveedores, horarios…" />
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="roomName">Nombre del salón</Label>
                <Input id="roomName" name="roomName" required maxLength={80} placeholder="Ej. Salón principal" className="mt-1" />
              </div>
              <fieldset>
                <legend className="text-sm font-medium">Capacidad por montaje (opcional)</legend>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {[
                    ["banquetCapacity", "Banquete"],
                    ["cocktailCapacity", "Cóctel"],
                    ["theaterCapacity", "Auditorio"],
                  ].map(([name, label]) => (
                    <div key={name}>
                      <Label htmlFor={name} className="text-xs text-muted-foreground">
                        {label}
                      </Label>
                      <Input id={name} name={name} type="number" min={1} step={1} inputMode="numeric" className="mt-0.5" />
                    </div>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Lock className="mt-0.5 size-3.5 shrink-0" />
            Queda privado: lo ven tú y quienes participan en esta boda. Solo un administrador puede publicarlo para toda la plataforma.
          </p>
        </form>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={() => openDialog(null)}>
          Cancelar
        </Button>
        <Button type="submit" form="save-room-form" disabled={saving || rooms === null || empty}>
          {saving ? "Guardando…" : "Guardar en la biblioteca"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function FloorPlanContent() {
  const backgroundImage = useCanvasStore((s) => s.backgroundImage);
  const setBackgroundImage = useCanvasStore((s) => s.setBackgroundImage);
  const startCalibration = useCanvasStore((s) => s.startCalibration);
  const openDialog = useRoomLibraryStore((s) => s.openDialog);
  const [busy, startBusy] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  /** Pone la imagen de fondo encajada en el lienzo (conserva la posición si es la misma). */
  async function placeImage(url: string) {
    const size = await loadImageSize(url);
    const { canvasWidth, canvasHeight } = useCanvasStore.getState();
    setBackgroundImage(fitPlanImage(url, size.width, size.height, canvasWidth, canvasHeight));
    toast.success("Plano importado. Ahora calibra la escala marcando dos puntos de medida conocida.");
  }

  function upload(file: File) {
    startBusy(async () => {
      const fd = new FormData();
      fd.set("file", file);
      try {
        const result = await uploadFloorPlan(fd);
        if (!result.ok) return void toast.error(result.error);
        await placeImage(result.url);
      } catch {
        toast.error("No se pudo subir el plano. Revisa el archivo (máx. 10 MB) y vuelve a intentar.");
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  return (
    <DialogContent className={cn("sm:max-w-md", SCROLLABLE_DIALOG)}>
      <DialogHeader>
        <DialogTitle>Importar plano</DialogTitle>
        <DialogDescription>
          Sube la imagen del plano del salón para usarla de fondo: calca paredes y columnas encima y calibra la escala con
          una medida conocida. Si lo tienes en PDF, expórtalo como imagen (PNG o JPG).
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
            }}
          />
          <Button variant="outline" className="w-full" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
            {backgroundImage ? "Reemplazar imagen del plano" : "Subir imagen del plano"}
          </Button>
        </div>
        {backgroundImage && (
          <div className="space-y-2 rounded-lg border border-border p-3">
            <Label htmlFor="plan-opacity" className="flex justify-between">
              Opacidad del plano
              <span className="text-muted-foreground tabular-nums">{Math.round(backgroundImage.opacity * 100)}%</span>
            </Label>
            <input
              id="plan-opacity"
              type="range"
              min={10}
              max={100}
              step={5}
              value={Math.round(backgroundImage.opacity * 100)}
              onChange={(e) => setBackgroundImage({ ...backgroundImage, opacity: Number(e.target.value) / 100 }, "plan-opacity")}
              className="w-full accent-primary"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  openDialog(null);
                  startCalibration();
                }}
              >
                <Ruler className="size-3.5" />
                Calibrar escala
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBackgroundImage(null);
                  toast.success("Plano quitado (Ctrl+Z para deshacer).");
                }}
              >
                <Trash2 className="size-3.5 text-destructive" />
                Quitar plano
              </Button>
            </div>
          </div>
        )}
      </div>
    </DialogContent>
  );
}

/**
 * Revisión antes de copiar una versión de la biblioteca al plano: la capa se convierte a la escala
 * del layout y se listan las mesas que chocarían (fuera del salón, sobre paredes/columnas/bar o
 * tapando puertas y salidas). Nada cambia hasta confirmar; siempre se puede cancelar.
 */
function RoomReviewDialog() {
  const review = useRoomLibraryStore((s) => s.review);
  const setReview = useRoomLibraryStore((s) => s.setReview);
  const remember = useRoomLibraryStore((s) => s.remember);
  const elements = useCanvasStore((s) => s.elements);
  const pxPerMeter = useCanvasStore((s) => s.pxPerMeter);
  const applyRoomLayer = useCanvasStore((s) => s.applyRoomLayer);

  const scaled = useMemo(() => (review ? scaleRoomLayer(review.data, resolvePxPerMeter(pxPerMeter)) : null), [review, pxPerMeter]);
  // Si no cabe en los límites del servidor, el autoguardado lo deformaría: no se deja aplicar.
  const limitIssue = useMemo(() => (review ? scaledRoomLayerIssue(review.data, resolvePxPerMeter(pxPerMeter)) : null), [review, pxPerMeter]);
  const conflicts = useMemo(() => (scaled && !limitIssue ? findRoomConflicts(elements, scaled) : []), [elements, scaled, limitIssue]);
  const replacing = review?.mode === "use" && hasRoomContent(currentLayer());

  function apply() {
    if (!review || !scaled || limitIssue) return;
    applyRoomLayer(scaled, review.data.id);
    remember(review.info);
    setReview(null);
    toast.success(
      review.mode === "update" ? `Salón actualizado a la versión ${review.data.version}.` : `Usando ${review.info.venueName} · ${review.info.roomName}.`
    );
  }

  return (
    <Dialog open={!!review} onOpenChange={(open) => !open && setReview(null)}>
      {review && (
        <DialogContent className={cn("sm:max-w-lg", SCROLLABLE_DIALOG)}>
          <DialogHeader>
            <DialogTitle>
              {review.mode === "update"
                ? `Actualizar a la versión ${review.data.version}`
                : `Usar ${review.info.venueName} · ${review.info.roomName}`}
            </DialogTitle>
            <DialogDescription>
              {replacing || review.mode === "update"
                ? "Reemplaza el contorno, las paredes, columnas, puertas y el plano de fondo actuales. "
                : "Copia el contorno, las paredes, columnas, puertas y el plano de fondo del salón. "}
              Tus mesas e invitados no se mueven; puedes deshacerlo con Ctrl+Z.
            </DialogDescription>
          </DialogHeader>
          {limitIssue ? (
            <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {limitIssue}
            </p>
          ) : conflicts.length === 0 ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-muted-foreground">
              Sin choques: ninguna mesa queda fuera del salón, sobre una pared o columna, ni tapa puertas o salidas.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
                <AlertTriangle className="size-4" />
                {conflicts.length === 1 ? "1 choque con el salón" : `${conflicts.length} choques con el salón`}
              </p>
              <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {conflicts.map((c, i) => (
                  <li key={`${c.elementId}-${c.kind}-${c.fixtureId ?? i}`} className="flex gap-2">
                    <span className="shrink-0 font-medium">{c.elementLabel}:</span>
                    <span className="text-muted-foreground">{c.message}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">Si actualizas, tendrás que mover esas mesas a mano.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReview(null)}>
              Cancelar
            </Button>
            <Button onClick={apply} disabled={!!limitIssue}>
              {conflicts.length > 0
                ? review.mode === "update"
                  ? "Actualizar de todos modos"
                  : "Usar de todos modos"
                : review.mode === "update"
                  ? "Actualizar salón"
                  : "Usar este salón"}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
