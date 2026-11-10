/** Carpetas de Fotos. Cada una tiene su subcarpeta dentro de "WeddingPlanner" en Google Drive. */
export const MEDIA_FOLDERS = [
  { key: "invitacion", label: "Invitación", driveName: "Invitación", description: "Fotos que se usan en la invitación digital." },
  { key: "boda", label: "Fotos de la boda", driveName: "Fotos de la boda", description: "Las que suben los invitados con el QR, y las del día." },
  { key: "otros", label: "Otros", driveName: "Otros", description: "Referencias, inspiración, mapas y links." },
] as const;

export type MediaFolder = (typeof MEDIA_FOLDERS)[number]["key"];

export const DEFAULT_MEDIA_FOLDER: MediaFolder = "otros";

export function parseMediaFolder(value: unknown): MediaFolder {
  return MEDIA_FOLDERS.some((f) => f.key === value) ? (value as MediaFolder) : DEFAULT_MEDIA_FOLDER;
}

/** Filtro de Prisma: "otros" también incluye los elementos guardados antes de existir carpetas. */
export function folderWhere(folder: MediaFolder) {
  return folder === DEFAULT_MEDIA_FOLDER ? { OR: [{ folder }, { folder: null }, { folder: { isSet: false } }] } : { folder };
}

/** Miniatura pública de un archivo de Drive compartido por link (fotos y videos). */
export const driveThumbnail = (driveFileId: string, width = 600) => `https://lh3.googleusercontent.com/d/${driveFileId}=w${width}`;
