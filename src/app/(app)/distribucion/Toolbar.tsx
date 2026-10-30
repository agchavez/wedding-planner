"use client";

import {
  BrickWall,
  Circle,
  DoorOpen,
  Hand,
  LayoutGrid,
  LogOut,
  Martini,
  MousePointer2,
  PanelTop,
  RectangleHorizontal,
  Square,
  type LucideIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { toast } from "sonner";
import { useCanvasStore } from "@/app/(app)/distribucion/canvasStore";
import { layerLimitMessage } from "@/app/(app)/distribucion/SelectionActionBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ELEMENT_ICONS, ELEMENT_LABELS, TOOL_GROUPS, type ElementType } from "@/lib/seatGeometry";
import { FIXTURE_LABELS, FIXTURE_TYPES, type FixtureType } from "@/lib/roomFixtures";

const FIXTURE_ICONS: Record<FixtureType, LucideIcon> = {
  wall: BrickWall,
  column: Square,
  "column-round": Circle,
  door: DoorOpen,
  window: PanelTop,
  "emergency-exit": LogOut,
  bar: Martini,
};

/** Botón redondo de la barra inferior; `active` = herramienta elegida. */
export function DockButton({
  label,
  active,
  className,
  children,
  ...props
}: ComponentProps<"button"> & { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40 [&_svg]:size-4",
        active && "bg-primary text-primary-foreground hover:bg-primary/90",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function DockSeparator() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />;
}

function DockMenu({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<DockButton label={label} />}>{icon}</DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" sideOffset={10} className="w-56">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Barra de herramientas flotante en forma de píldora, abajo del lienzo: seleccionar / mover el
 * plano y agregar mesas y zonas (o, en "Editar salón", paredes, columnas y puertas).
 */
export function EditorDock() {
  const tool = useCanvasStore((s) => s.tool);
  const setTool = useCanvasStore((s) => s.setTool);
  const roomEditMode = useCanvasStore((s) => s.roomEditMode);
  const storeAddElement = useCanvasStore((s) => s.addElement);
  const storeAddFixture = useCanvasStore((s) => s.addFixture);
  // Si la capa ya llegó a su máximo no se agrega nada: se avisa.
  const addElement = (type: ElementType) => {
    if (!storeAddElement(type)) toast.error(layerLimitMessage({ roomEditMode: false }));
  };
  const addFixture = (type: FixtureType) => {
    if (!storeAddFixture(type)) toast.error(layerLimitMessage({ roomEditMode: true }));
  };

  return (
    <div
      role="toolbar"
      aria-label="Herramientas del plano"
      className="pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-border bg-card/95 px-2 py-1.5 shadow-lg backdrop-blur"
    >
      <DockButton label="Seleccionar (V)" active={tool === "select"} onClick={() => setTool("select")}>
        <MousePointer2 />
      </DockButton>
      <DockButton label="Mover el plano (H o mantén Espacio)" active={tool === "pan"} onClick={() => setTool("pan")}>
        <Hand />
      </DockButton>
      <DockSeparator />
      {roomEditMode ? (
        <>
          <DockButton label={FIXTURE_LABELS.wall} onClick={() => addFixture("wall")}>
            <BrickWall />
          </DockButton>
          <DockButton label={FIXTURE_LABELS.column} onClick={() => addFixture("column")}>
            <Square />
          </DockButton>
          <DockButton label={FIXTURE_LABELS.door} onClick={() => addFixture("door")}>
            <DoorOpen />
          </DockButton>
          <DockMenu label="Más elementos fijos" icon={<LayoutGrid />}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Elementos fijos del salón</DropdownMenuLabel>
              {FIXTURE_TYPES.map((type) => {
                const Icon = FIXTURE_ICONS[type];
                return (
                  <DropdownMenuItem key={type} onClick={() => addFixture(type)}>
                    <Icon className="size-4" />
                    {FIXTURE_LABELS[type]}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </DockMenu>
        </>
      ) : (
        <>
          <DockButton label="Mesa redonda" onClick={() => addElement("table-round")}>
            <Circle />
          </DockButton>
          <DockButton label="Mesa rectangular" onClick={() => addElement("table-rectangular")}>
            <RectangleHorizontal />
          </DockButton>
          <DockMenu label="Mesas, ceremonia, pista y zonas" icon={<LayoutGrid />}>
            {TOOL_GROUPS.map((group, i) => (
              <DropdownMenuGroup key={group.label}>
                {i > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                {group.types.map((type) => {
                  const Icon = ELEMENT_ICONS[type];
                  return (
                    <DropdownMenuItem key={type} onClick={() => addElement(type)}>
                      <Icon className="size-4" />
                      {ELEMENT_LABELS[type]}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
            ))}
          </DockMenu>
        </>
      )}
    </div>
  );
}
