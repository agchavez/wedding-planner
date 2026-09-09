export const THEMES = [
  { value: "blush", label: "Blush rosa + dorado" },
  { value: "terracota", label: "Terracota + sálvia" },
  { value: "burdeos", label: "Burdeos + dorado" },
] as const;

export type ThemeName = (typeof THEMES)[number]["value"];

export const DEFAULT_THEME: ThemeName = "blush";
export const THEME_STORAGE_KEY = "weddingplanner-theme";

export function isThemeName(value: string | null): value is ThemeName {
  return THEMES.some((t) => t.value === value);
}
