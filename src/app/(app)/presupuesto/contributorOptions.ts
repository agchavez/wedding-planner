export const CONTRIBUTOR_OPTIONS = [
  { value: "groom", label: "Novio" },
  { value: "bride", label: "Novia" },
  { value: "groom_parents", label: "Papás del novio" },
  { value: "bride_parents", label: "Papás de la novia" },
  { value: "other", label: "Otro" },
] as const;

export const CONTRIBUTOR_LABEL: Record<string, string> = Object.fromEntries(
  CONTRIBUTOR_OPTIONS.map((o) => [o.value, o.label])
);

export function contributorDisplayLabel(contributor: string, otherLabel: string): string {
  if (contributor === "other") return otherLabel.trim() || "Otro";
  return CONTRIBUTOR_LABEL[contributor] ?? contributor;
}
