"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CloudOff,
  Eye,
  ListOrdered,
  Loader2,
  MessageCircle,
  Music,
  Plus,
  Redo2,
  RotateCcw,
  Send,
  Undo2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useWeddingAccess } from "@/components/WeddingAccess";
import { InvitationView } from "@/components/invitation/InvitationView";
import { ExampleTemplates } from "@/app/(app)/invitaciones/ExampleTemplates";
import { WhatsAppBubble } from "@/app/(app)/invitaciones/WhatsAppPreview";
import { discardInvitationDraft, publishInvitation, saveInvitationDraft } from "@/app/(app)/invitaciones/actions";
import { AddBlockMenu, BlockList, type BlockListActions } from "@/app/(app)/invitaciones/editor/BlockList";
import { BlockInspector, GlobalInspector } from "@/app/(app)/invitaciones/editor/BlockInspector";
import type { PickerPhoto } from "@/app/(app)/invitaciones/editor/PhotoPicker";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { arrayMove } from "@dnd-kit/sortable";
import { breakHistoryGroup, emptyHistory, recordHistory, redoHistory, undoHistory, type History } from "@/lib/editorHistory";
import { BLOCK_INFO, createBlock, designKey, newBlockId, type BlockType, type InvitationBlock, type InvitationDesign } from "@/lib/invitationBlocks";
import type { InvitationData, InvitationGuestData } from "@/lib/guestInvitations";
import { cn } from "@/lib/utils";

type SaveState = "saved" | "pending" | "saving" | "error";

const AUTOSAVE_MS = 900;

const isDesktop = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

export function BlockEditor({
  data,
  initialDraft,
  initialPublished,
  publishedAt: initialPublishedAt,
  photos,
  sampleGuest,
  highlightExample,
}: {
  data: InvitationData;
  initialDraft: InvitationDesign;
  initialPublished: InvitationDesign;
  publishedAt: string | null;
  photos: PickerPhoto[];
  sampleGuest: InvitationGuestData;
  highlightExample?: string;
}) {
  const { canEdit } = useWeddingAccess();
  // Diseño e historial juntos: deshacer y rehacer son actualizaciones puras.
  const [state, setState] = useState<{ design: InvitationDesign; history: History<InvitationDesign> }>(() => ({
    design: initialDraft,
    history: emptyHistory(),
  }));
  const { design, history } = state;
  const [publishedKey, setPublishedKey] = useState(() => designKey(initialPublished));
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("saved");
  const [publishing, setPublishing] = useState(false);
  const [sheet, setSheet] = useState<"block" | "order" | "song" | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(Boolean(highlightExample));
  const previewRef = useRef<HTMLDivElement>(null);

  const selected = design.blocks.find((b) => b.id === selectedId) ?? null;
  const key = useMemo(() => designKey(design), [design]);
  const hasChanges = key !== publishedKey;

  /* ---------------- Autoguardado del borrador ---------------- */
  const latest = useRef(design);
  const savedKey = useRef(designKey(initialDraft));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);

  const saveNow = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const current = latest.current;
    const k = designKey(current);
    if (k === savedKey.current) {
      setSave("saved");
      return;
    }
    setSave("saving");
    const run = (async () => {
      try {
        const result = await saveInvitationDraft(current);
        if (!result.ok) throw new Error(result.error);
        savedKey.current = k;
        setSave(designKey(latest.current) === k ? "saved" : "pending");
      } catch {
        setSave("error");
      }
    })();
    inFlight.current = run;
    await run;
  }, []);

  useEffect(() => {
    latest.current = design;
    if (!canEdit || designKey(design) === savedKey.current) return;
    setSave("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveNow(), AUTOSAVE_MS);
  }, [design, canEdit, saveNow]);

  // Al salir con cambios sin guardar, el navegador pregunta.
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (save === "pending" || save === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [save]);

  async function flush() {
    if (inFlight.current) await inFlight.current;
    await saveNow();
  }

  /* ---------------- Cambios con historial ---------------- */
  const update = useCallback((fn: (d: InvitationDesign) => InvitationDesign, historyKey?: string) => {
    setState((s) => {
      const next = fn(s.design);
      return next === s.design ? s : { design: next, history: recordHistory(s.history, s.design, { key: historyKey }) };
    });
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      const r = undoHistory(s.history, s.design);
      return r ? { design: r.state, history: r.history } : s;
    });
  }, []);
  const redo = useCallback(() => {
    setState((s) => {
      const r = redoHistory(s.history, s.design);
      return r ? { design: r.state, history: r.history } : s;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z" && e.key.toLowerCase() !== "y") return;
      e.preventDefault();
      if (e.key.toLowerCase() === "y" || e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const setBlock = (id: string, patch: (b: InvitationBlock) => InvitationBlock, historyKey?: string) =>
    update((d) => ({ ...d, blocks: d.blocks.map((b) => (b.id === id ? patch(b) : b)) }), historyKey);

  const actions: BlockListActions = {
    onSelect: (id) => selectBlock(id, true),
    onMove: (from, to) => update((d) => ({ ...d, blocks: arrayMove(d.blocks, from, to) })),
    onToggleHidden: (id) => setBlock(id, (b) => (b.type === "rsvp" ? b : { ...b, hidden: !b.hidden })),
    onDuplicate: (id) =>
      update((d) => {
        const i = d.blocks.findIndex((b) => b.id === id);
        if (i === -1 || d.blocks[i].type === "rsvp") return d;
        const copy = { ...structuredClone(d.blocks[i]), id: newBlockId() };
        const blocks = [...d.blocks];
        blocks.splice(i + 1, 0, copy);
        return { ...d, blocks };
      }),
    onDelete: (id) => {
      const block = design.blocks.find((b) => b.id === id);
      if (!block || !BLOCK_INFO[block.type].removable) return;
      update((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) }));
      if (selectedId === id) setSelectedId(null);
      toast(`Se eliminó «${BLOCK_INFO[block.type].label}»`, { action: { label: "Deshacer", onClick: undo } });
    },
  };

  function addBlock(type: BlockType) {
    const block = createBlock(type) as InvitationBlock;
    update((d) => {
      // Después del seleccionado; si no, antes de la confirmación.
      const at = selectedId ? d.blocks.findIndex((b) => b.id === selectedId) + 1 : d.blocks.findIndex((b) => b.type === "rsvp");
      const blocks = [...d.blocks];
      blocks.splice(at <= 0 ? blocks.length : at, 0, block);
      return { ...d, blocks };
    });
    selectBlock(block.id, true);
  }

  function selectBlock(id: string, scroll: boolean) {
    setSelectedId(id);
    setState((s) => ({ ...s, history: breakHistoryGroup(s.history) }));
    if (!isDesktop()) setSheet("block");
    if (scroll) {
      requestAnimationFrame(() =>
        previewRef.current?.querySelector(`[data-block-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" })
      );
    }
  }

  /* ---------------- Publicar, descartar, vistas previas ---------------- */
  async function publish() {
    setPublishing(true);
    try {
      await flush();
      const result = await publishInvitation(latest.current);
      if (!result.ok) throw new Error(result.error);
      setPublishedKey(designKey(latest.current));
      setPublishedAt(result.publishedAt);
      toast.success("Invitación publicada", { description: "Tus invitados ya ven esta versión." });
    } catch {
      toast.error("No se pudo publicar la invitación.");
    } finally {
      setPublishing(false);
    }
  }

  async function discard() {
    const published = await discardInvitationDraft();
    savedKey.current = designKey(published);
    update(() => published);
    setSelectedId(null);
    setSave("saved");
  }

  async function openAsGuest() {
    const w = window.open("about:blank", "_blank");
    await flush();
    const url = `/vista-previa/invitacion?nombre=${encodeURIComponent(sampleGuest.fullName)}&lugares=${sampleGuest.seats}`;
    if (w) w.location.href = url;
    else window.open(url, "_blank");
  }

  async function openCard() {
    setCardOpen(true);
    await flush();
  }

  const view = (
    <InvitationView
      data={data}
      design={design}
      guest={sampleGuest}
      embedded
      selectedId={selectedId}
      onSelectBlock={canEdit ? (id) => selectBlock(id, false) : undefined}
    />
  );

  const inspector = selected ? (
    <BlockInspector
      key={selected.id}
      block={selected}
      photos={photos}
      disabled={!canEdit}
      onChange={(props, historyKey) => setBlock(selected.id, (b) => ({ ...b, props }) as InvitationBlock, historyKey)}
      onToggleHidden={() => actions.onToggleHidden(selected.id)}
    />
  ) : (
    <GlobalInspector design={design} disabled={!canEdit} onChange={(song, k) => update((d) => ({ ...d, song }), k)} />
  );

  const list = (
    <div className="space-y-3">
      <BlockList blocks={design.blocks} selectedId={selectedId} disabled={!canEdit} actions={actions} />
      {canEdit && <AddBlockMenu onAdd={addBlock} className="w-full" />}
    </div>
  );

  return (
    <div className="space-y-3 pb-20 lg:pb-0">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-2">
        <SaveBadge state={save} hasChanges={hasChanges} publishedAt={publishedAt} canEdit={canEdit} />
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {canEdit && (
            <>
              <Button type="button" variant="ghost" size="icon-sm" onClick={undo} disabled={history.past.length === 0} aria-label="Deshacer" title="Deshacer (Ctrl+Z)">
                <Undo2 className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={redo} disabled={history.future.length === 0} aria-label="Rehacer" title="Rehacer (Ctrl+Shift+Z)">
                <Redo2 className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setExamplesOpen(true)} className="hidden sm:inline-flex">
                <Wand2 className="size-3.5" /> Ejemplos
              </Button>
            </>
          )}
          <Button type="button" variant="outline" size="sm" onClick={openAsGuest}>
            <Eye className="size-3.5" /> <span className="hidden sm:inline">Ver como invitado</span>
            <span className="sm:hidden">Ver</span>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={openCard} aria-label="Vista en WhatsApp">
            <MessageCircle className="size-3.5" /> <span className="hidden sm:inline">WhatsApp</span>
          </Button>
          {canEdit && hasChanges && (
            <ConfirmDeleteDialog
              triggerRender={<Button type="button" variant="ghost" size="sm" className="hidden sm:inline-flex" />}
              triggerChildren={
                <>
                  <RotateCcw className="size-3.5" /> Descartar
                </>
              }
              title="¿Descartar los cambios?"
              description="El borrador vuelve a ser igual a la invitación publicada."
              confirmLabel="Descartar cambios"
              successMessage="Cambios descartados"
              onConfirm={discard}
            />
          )}
          {canEdit && (
            <Button type="button" size="sm" onClick={publish} disabled={publishing || !hasChanges}>
              {publishing ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Publicar
            </Button>
          )}
        </div>
      </div>

      {/* Lista · vista previa · inspector */}
      <div className="lg:grid lg:h-[calc(100svh-15rem)] lg:min-h-[600px] lg:grid-cols-[15.5rem_minmax(0,1fr)_21rem] lg:gap-4">
        <aside className="hidden min-h-0 flex-col rounded-2xl border border-border bg-card lg:flex">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <p className="text-sm font-medium">Bloques</p>
            <button type="button" onClick={() => setSelectedId(null)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <Music className="size-3" /> Canción
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">{list}</div>
        </aside>

        <div className="min-h-0 lg:flex lg:justify-center">
          <div
            ref={previewRef}
            className="-mx-4 overflow-hidden sm:mx-0 sm:rounded-2xl sm:border sm:border-border lg:h-full lg:w-[390px] lg:overflow-y-auto lg:overscroll-contain lg:rounded-[2.2rem] lg:border-[8px] lg:border-[#d9d4c1] lg:shadow-xl lg:[scrollbar-width:thin]"
          >
            {view}
          </div>
        </div>

        <aside className="hidden min-h-0 overflow-y-auto rounded-2xl border border-border bg-card p-4 lg:block">{inspector}</aside>
      </div>

      {/* Teléfono: barra inferior */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around gap-1 border-t border-border bg-card/95 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <MobileAction icon={ListOrdered} label="Ordenar" onClick={() => setSheet("order")} />
        <MobileAction icon={Music} label="Canción" onClick={() => (setSelectedId(null), setSheet("song"))} />
        {canEdit && <MobileAction icon={Undo2} label="Deshacer" onClick={undo} disabled={history.past.length === 0} />}
        {canEdit && (
          <MobileAction
            icon={publishing ? Loader2 : Send}
            label="Publicar"
            onClick={publish}
            disabled={publishing || !hasChanges}
            primary
          />
        )}
      </div>

      <Sheet open={sheet === "block" && Boolean(selected)} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="max-h-[82svh] rounded-t-2xl">
          <SheetHeader className="pb-0">
            <SheetTitle>{selected ? BLOCK_INFO[selected.type].label : "Bloque"}</SheetTitle>
            <SheetDescription className="sr-only">Campos del bloque</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 overflow-y-auto px-4 pb-6">{inspector}</div>
        </SheetContent>
      </Sheet>
      <Sheet open={sheet === "song"} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="max-h-[82svh] rounded-t-2xl">
          <SheetHeader className="pb-0">
            <SheetTitle>Ajustes</SheetTitle>
            <SheetDescription className="sr-only">Canción de la invitación</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 overflow-y-auto px-4 pb-6">
            <GlobalInspector design={design} disabled={!canEdit} onChange={(song, k) => update((d) => ({ ...d, song }), k)} />
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={sheet === "order"} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="bottom" className="max-h-[85svh] rounded-t-2xl">
          <SheetHeader className="pb-0">
            <SheetTitle>Ordenar bloques</SheetTitle>
            <SheetDescription>Mantén presionado el ícono ⋮⋮ y arrastra. Toca un bloque para editarlo.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 overflow-y-auto px-4 pb-6">{list}</div>
        </SheetContent>
      </Sheet>

      <Dialog open={cardOpen} onOpenChange={setCardOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Así se verá en WhatsApp</DialogTitle>
            <DialogDescription>Tarjeta del enlace con el borrador actual (al publicar, es la que reciben tus invitados).</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-[#efeae2] p-3">
            {cardOpen && save !== "saving" && (
              <WhatsAppBubble
                text={`¡Hola ${sampleGuest.fullName.split(" ")[0]}! Te compartimos nuestra invitación 💌`}
                preview={{
                  image: `/vista-previa/tarjeta?nombre=${encodeURIComponent(sampleGuest.fullName)}&v=${hashKey(key)}`,
                  title: `${sampleGuest.fullName.split(" ")[0]}, te invitamos a la boda de ${[data.partner1, data.partner2].filter(Boolean).join(" & ")}`,
                  description: "Abre tu invitación y confirma tu asistencia 💌",
                  domain: typeof window !== "undefined" ? window.location.host : "",
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={examplesOpen} onOpenChange={setExamplesOpen}>
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Ejemplos</DialogTitle>
            <DialogDescription>Copia los textos y fotos de un ejemplo al borrador.</DialogDescription>
          </DialogHeader>
          <ExampleTemplates
            highlight={highlightExample}
            onApplied={(next) => {
              savedKey.current = designKey(next);
              update(() => next);
              setExamplesOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function hashKey(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function SaveBadge({ state, hasChanges, publishedAt, canEdit }: { state: SaveState; hasChanges: boolean; publishedAt: string | null; canEdit: boolean }) {
  if (!canEdit) return <span className="px-2 text-xs text-muted-foreground">Solo lectura</span>;
  const saving = state === "pending" || state === "saving";
  return (
    <div className="flex items-center gap-2 px-1.5 text-xs">
      <span className={cn("flex items-center gap-1", state === "error" ? "text-destructive" : "text-muted-foreground")}>
        {state === "error" ? <CloudOff className="size-3.5" /> : saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        {state === "error" ? "No se pudo guardar" : saving ? "Guardando…" : "Borrador guardado"}
      </span>
      <span
        title={publishedAt ? `Publicada el ${new Date(publishedAt).toLocaleString("es-HN")}` : undefined}
        className={cn(
          "rounded-full px-2 py-0.5 font-medium",
          hasChanges ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
        )}
      >
        {hasChanges ? "Cambios sin publicar" : "Publicada"}
      </span>
    </div>
  );
}

function MobileAction({
  icon: Icon,
  label,
  onClick,
  disabled,
  primary,
}: {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-w-16 flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium disabled:opacity-40",
        primary ? "bg-primary text-primary-foreground" : "text-foreground"
      )}
    >
      <Icon className={cn("size-5", Icon === Loader2 && "animate-spin")} />
      {label}
    </button>
  );
}
