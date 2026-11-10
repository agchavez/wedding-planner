/** Etiqueta de los archivos que suben los invitados desde /compartir/<id>. */
export const GUEST_LABEL_PREFIX = "Invitado · ";

/** Tamaño máximo por archivo (el proxy acepta hasta 25 MB por solicitud). */
export const GUEST_MAX_BYTES = 24 * 1024 * 1024;

/** Miniatura pública de un archivo de Drive compartido con "cualquiera con el enlace". */
export const driveThumb = (driveFileId: string, width = 800) => `https://lh3.googleusercontent.com/d/${driveFileId}=w${width}`;
