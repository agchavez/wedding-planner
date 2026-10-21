import { X } from "lucide-react";
import { labelColor } from "@/lib/guestLabels";
import { cn } from "@/lib/utils";

/** Etiqueta de invitado con su color; con `onRemove` muestra una ✕ para quitarla. */
export function LabelChip({
  name,
  color,
  onRemove,
  className,
}: {
  name: string;
  color: string;
  onRemove?: () => void;
  className?: string;
}) {
  const c = labelColor(color);
  return (
    <span
      className={cn(
        "inline-flex h-5 max-w-40 items-center gap-1 rounded-full px-2 text-[0.7rem] font-medium ring-1 ring-inset",
        c.chip,
        className
      )}
    >
      <span className="truncate">{name}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} className="-mr-1 rounded-full p-0.5 hover:bg-black/10" aria-label={`Quitar ${name}`}>
          <X className="size-2.5" />
        </button>
      )}
    </span>
  );
}

export function LabelDot({ color, className }: { color: string; className?: string }) {
  return <span className={cn("inline-block size-2.5 shrink-0 rounded-full", className)} style={{ background: labelColor(color).dot }} />;
}
