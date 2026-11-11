/**
 * Canción de la invitación subida al servidor: se guarda en uploads/songs/<boda>/ y se sirve
 * públicamente (los invitados no tienen sesión) desde /api/cancion/<boda>/<archivo>.
 * Módulo puro: lo usan el saneamiento del diseño, la acción de subida y la ruta que la sirve.
 */

export const SONG_MAX_BYTES = 15 * 1024 * 1024; // 15 MB: una canción completa en mp3 de buena calidad.

export type SongKind = "mp3" | "m4a";

export const SONG_CONTENT_TYPES: Record<SongKind, string> = { mp3: "audio/mpeg", m4a: "audio/mp4" };

const SONG_FILE_RE = /^[a-zA-Z0-9._-]{1,140}\.(mp3|m4a)$/i;
const SONG_URL_RE = /^\/api\/cancion\/([a-f0-9]{24})\/([a-zA-Z0-9._-]{1,140}\.(?:mp3|m4a))$/i;

/** Nombre de archivo servible: sin rutas, solo mp3 o m4a. Devuelve el tipo o null. */
export function songFileKind(fileName: string): SongKind | null {
  if (fileName.includes("..")) return null;
  const m = SONG_FILE_RE.exec(fileName);
  return m ? (m[1].toLowerCase() as SongKind) : null;
}

export const songUrl = (weddingId: string, fileName: string) => `/api/cancion/${weddingId}/${fileName}`;

/** Boda dueña de una canción subida, o null si la URL no es de una canción de este servidor. */
export function uploadedSongOwner(url: string): string | null {
  const m = SONG_URL_RE.exec(url);
  return m && !m[2].includes("..") ? m[1].toLowerCase() : null;
}

/** Tipo de audio según sus primeros bytes (no se confía en la extensión ni en el tipo declarado). */
export function detectSongKind(bytes: Uint8Array): SongKind | null {
  if (bytes.length < 12) return null;
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (ascii(0, 3) === "ID3") return "mp3"; // mp3 con etiquetas ID3v2
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0 && (bytes[1] & 0x06) !== 0) return "mp3"; // cuadro MPEG de audio
  if (ascii(4, 8) === "ftyp") return "m4a"; // contenedor MP4 (AAC de iTunes)
  return null;
}

/** "03_Mi-cancion.mp3" → "03 Mi cancion", para proponerlo como nombre de la canción. */
export function songTitleFromFileName(name: string): string {
  return name
    .replace(/\.[a-z0-9]{2,4}$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

/* Fragmento: la invitación puede reproducir solo un tramo de la canción (en segundos). */

export const SONG_MAX_SECONDS = 3600;

/** "1:05" o "65" → 65; vacío → 0; algo que no es un tiempo → null. */
export function parseSongTime(value: string): number | null {
  const t = value.trim().replace(",", ".");
  if (!t) return 0;
  const m = /^(?:(\d{1,3}):)?(\d{1,4}(?:\.\d)?)$/.exec(t);
  if (!m) return null;
  const seconds = Number(m[2]);
  if (m[1] !== undefined && seconds >= 60) return null;
  const total = (m[1] ? Number(m[1]) * 60 : 0) + seconds;
  return total <= SONG_MAX_SECONDS ? total : null;
}

/** 65 → "1:05"; 65.5 → "1:05.5". */
export function formatSongTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds * 10) / 10);
  const m = Math.floor(total / 60);
  const rest = Math.round((total - m * 60) * 10) / 10;
  const [whole, tenth] = String(rest).split(".");
  return `${m}:${whole.padStart(2, "0")}${tenth ? `.${tenth}` : ""}`;
}

/**
 * Tramo válido: `start` desde 0 y `end` en 0 (hasta el final) o después del inicio. Un final que
 * no deja al menos un segundo de música se descarta.
 */
export function cleanSongRange(start: unknown, end: unknown): { start: number; end: number } {
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(Math.min(SONG_MAX_SECONDS, Math.max(0, v)) * 10) / 10 : 0);
  const s = num(start);
  const e = num(end);
  return { start: s, end: e >= s + 1 ? e : 0 };
}
