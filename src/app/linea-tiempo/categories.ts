export const TIMELINE_CATEGORY_OPTIONS = [
  { value: "preparation", label: "Preparación" },
  { value: "ceremony", label: "Ceremonia" },
  { value: "reception", label: "Recepción" },
  { value: "party", label: "Fiesta" },
] as const;

export const TIMELINE_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  TIMELINE_CATEGORY_OPTIONS.map((o) => [o.value, o.label])
);

export const TIMELINE_CATEGORY_COLOR: Record<string, string> = {
  preparation: "bg-sky-100 text-sky-700",
  ceremony: "bg-violet-100 text-violet-700",
  reception: "bg-amber-100 text-amber-800",
  party: "bg-rose-100 text-rose-700",
};
