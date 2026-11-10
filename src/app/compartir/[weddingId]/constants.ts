/** Etiqueta de los archivos que suben los invitados desde /compartir/<id>. */
export const GUEST_LABEL_PREFIX = "Invitado · ";

/** Tamaño máximo por archivo (el proxy acepta hasta 25 MB por solicitud). */
export const GUEST_MAX_BYTES = 24 * 1024 * 1024;

/** Miniatura pública de un archivo de Drive compartido con "cualquiera con el enlace". */
export const driveThumb = (driveFileId: string, width = 800) => `https://lh3.googleusercontent.com/d/${driveFileId}=w${width}`;

const DAY = 24 * 60 * 60 * 1000;

/**
 * Ventana en la que la página acepta fotos: desde un día antes de la boda hasta 30 días después.
 * Sin fecha de boda no hay límite.
 */
export function guestUploadWindow(weddingDate: Date | null | undefined) {
  if (!weddingDate) return null;
  return { opens: new Date(weddingDate.getTime() - DAY), closes: new Date(weddingDate.getTime() + 31 * DAY) };
}

export function guestUploadState(weddingDate: Date | null | undefined, now = Date.now()): "open" | "soon" | "closed" {
  const window = guestUploadWindow(weddingDate);
  if (!window) return "open";
  if (now < window.opens.getTime()) return "soon";
  if (now >= window.closes.getTime()) return "closed";
  return "open";
}
