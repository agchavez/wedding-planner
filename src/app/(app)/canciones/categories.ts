export const SONG_CATEGORY_OPTIONS = [
  { value: "ceremony", label: "Ceremonia" },
  { value: "cocktail", label: "Cóctel" },
  { value: "entrance", label: "Entrada triunfal" },
  { value: "dinner", label: "Cena" },
  { value: "party", label: "Fiesta" },
  { value: "last_dance", label: "Última canción" },
  { value: "do_not_play", label: "No tocar" },
  { value: "other", label: "Otra" },
] as const;

export const SONG_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  SONG_CATEGORY_OPTIONS.map((o) => [o.value, o.label])
);
