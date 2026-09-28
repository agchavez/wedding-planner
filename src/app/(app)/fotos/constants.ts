export const MEDIA_TYPE_OPTIONS = [
  { value: "image", label: "Foto" },
  { value: "video", label: "Video" },
  { value: "map", label: "Mapa" },
  { value: "link", label: "Link" },
] as const;

export const MEDIA_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  MEDIA_TYPE_OPTIONS.map((o) => [o.value, o.label])
);
