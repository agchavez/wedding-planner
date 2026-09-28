export const THEMES = [
  { value: "blush", label: "Blush rosa + dorado", swatch: { primary: "#a8415c", accent: "#f1e6cf" } },
  { value: "terracota", label: "Terracota + sálvia", swatch: { primary: "#bc5a34", accent: "#dfe6d3" } },
  { value: "burdeos", label: "Burdeos + dorado", swatch: { primary: "#6d1f34", accent: "#d9c08f" } },
] as const;

export type ThemeName = (typeof THEMES)[number]["value"];

export const DEFAULT_THEME: ThemeName = "blush";
export const THEME_STORAGE_KEY = "weddingplanner-theme";

export function isThemeName(value: string | null): value is ThemeName {
  return THEMES.some((t) => t.value === value);
}

/** Variables CSS que el usuario puede sobreescribir a mano para personalizar el tema elegido. */
export const CUSTOM_COLOR_KEYS = ["primary", "accent"] as const;
export type CustomColorKey = (typeof CUSTOM_COLOR_KEYS)[number];
export type CustomColors = Partial<Record<CustomColorKey, string>>;

export const CUSTOM_COLORS_STORAGE_KEY = "weddingplanner-custom-colors";

export function getStoredCustomColors(): CustomColors {
  try {
    const raw = localStorage.getItem(CUSTOM_COLORS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const result: CustomColors = {};
    for (const key of CUSTOM_COLOR_KEYS) {
      if (typeof parsed[key] === "string") result[key] = parsed[key];
    }
    return result;
  } catch {
    return {};
  }
}

export function applyCustomColors(colors: CustomColors) {
  const root = document.documentElement;
  for (const key of CUSTOM_COLOR_KEYS) {
    const value = colors[key];
    if (value) root.style.setProperty(`--${key}`, value);
    else root.style.removeProperty(`--${key}`);
  }
}
