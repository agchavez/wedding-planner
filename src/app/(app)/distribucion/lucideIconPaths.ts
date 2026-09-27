/**
 * Rutas SVG reales de lucide-react (viewBox 0 0 24 24), extraídas una sola vez con
 * scripts/extract-lucide-paths.js. Se dibujan como formas nativas de Konva (LucideVectorIcon)
 * — íconos Lucide auténticos, sin cargar ninguna imagen ni depender de nada async.
 */
export type IconPrimitive =
  | { tag: "path"; d: string }
  | { tag: "circle"; cx: number; cy: number; r: number };

export const LUCIDE_ICON_PATHS: Record<string, IconPrimitive[]> = {
  Armchair: [
    { tag: "path", d: "M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" },
    {
      tag: "path",
      d: "M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z",
    },
    { tag: "path", d: "M5 18v2" },
    { tag: "path", d: "M19 18v2" },
  ],
  User: [
    { tag: "path", d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" },
    { tag: "circle", cx: 12, cy: 7, r: 4 },
  ],
  Mic: [
    { tag: "path", d: "M12 19v3" },
    { tag: "path", d: "M19 10v2a7 7 0 0 1-14 0v-2" },
    { tag: "path", d: "M9 2h6a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z" },
  ],
  Disc3: [
    { tag: "circle", cx: 12, cy: 12, r: 10 },
    { tag: "path", d: "M6 12c0-1.7.7-3.2 1.8-4.2" },
    { tag: "circle", cx: 12, cy: 12, r: 2 },
    { tag: "path", d: "M18 12c0 1.7-.7 3.2-1.8 4.2" },
  ],
  Camera: [
    {
      tag: "path",
      d: "M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z",
    },
    { tag: "circle", cx: 12, cy: 13, r: 3 },
  ],
  Cake: [
    { tag: "path", d: "M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" },
    { tag: "path", d: "M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" },
    { tag: "path", d: "M2 21h20" },
    { tag: "path", d: "M7 8v3" },
    { tag: "path", d: "M12 8v3" },
    { tag: "path", d: "M17 8v3" },
    { tag: "path", d: "M7 4h.01" },
    { tag: "path", d: "M12 4h.01" },
    { tag: "path", d: "M17 4h.01" },
  ],
  Church: [
    { tag: "path", d: "M10 9h4" },
    { tag: "path", d: "M12 7v5" },
    { tag: "path", d: "M14 21v-3a2 2 0 0 0-4 0v3" },
    { tag: "path", d: "m18 9 3.52 2.147a1 1 0 0 1 .48.854V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6.999a1 1 0 0 1 .48-.854L6 9" },
    { tag: "path", d: "M6 21V7a1 1 0 0 1 .376-.782l5-3.999a1 1 0 0 1 1.249.001l5 4A1 1 0 0 1 18 7v14" },
  ],
  Footprints: [
    { tag: "path", d: "M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z" },
    { tag: "path", d: "M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z" },
    { tag: "path", d: "M16 17h4" },
    { tag: "path", d: "M4 13h4" },
  ],
  DoorOpen: [
    { tag: "path", d: "M11 20H2" },
    { tag: "path", d: "M11 4.562v16.157a1 1 0 0 0 1.242.97L19 20V5.562a2 2 0 0 0-1.515-1.94l-4-1A2 2 0 0 0 11 4.561z" },
    { tag: "path", d: "M11 4H8a2 2 0 0 0-2 2v14" },
    { tag: "path", d: "M14 12h.01" },
    { tag: "path", d: "M22 20h-3" },
  ],
  Bath: [
    { tag: "path", d: "M10 4 8 6" },
    { tag: "path", d: "M17 19v2" },
    { tag: "path", d: "M2 12h20" },
    { tag: "path", d: "M7 19v2" },
    { tag: "path", d: "M9 5 7.621 3.621A2.121 2.121 0 0 0 4 5v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" },
  ],
  ArrowLeftRight: [
    { tag: "path", d: "M8 3 4 7l4 4" },
    { tag: "path", d: "M4 7h16" },
    { tag: "path", d: "m16 21 4-4-4-4" },
    { tag: "path", d: "M20 17H4" },
  ],
  Heart: [
    {
      tag: "path",
      d: "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",
    },
  ],
};
