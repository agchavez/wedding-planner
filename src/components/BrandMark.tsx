import { cn } from "@/lib/utils";

/** Isotipo de Wedplan: dos anillos entrelazados con un diamante. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("size-7 shrink-0", className)}>
      <rect width="64" height="64" rx="14" className="fill-primary" />
      <g fill="none" className="stroke-decorative" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="25" cy="36" r="13" />
        <circle cx="39" cy="36" r="13" />
        <path d="M25 13.5l3.2 3.2-3.2 4-3.2-4z" strokeWidth="2.6" />
      </g>
    </svg>
  );
}
