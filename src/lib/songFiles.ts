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
