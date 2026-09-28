import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Carpeta de archivos subidos (comprobantes de pago). Vive fuera de public/: Next solo sirve
 * lo que estaba en public/ al compilar, y los comprobantes no deben ser públicos. Se sirven
 * con control de acceso desde /api/uploads/… En Docker es un volumen (ver deploy/).
 */
export const UPLOADS_ROOT = process.env.UPLOADS_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "archivo";
}

/** Guarda un archivo subido en UPLOADS_ROOT/<subdir>/ y devuelve la URL con la que se sirve. */
export async function saveUploadedFile(
  file: File,
  subdir: string
): Promise<{ url: string; name: string } | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_FILE_SIZE) throw new Error("El archivo supera el límite de 10 MB.");

  const dir = path.join(UPLOADS_ROOT, subdir);
  await mkdir(dir, { recursive: true });

  const safeName = sanitizeFileName(file.name || "archivo");
  const fileName = `${crypto.randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, fileName), buffer);

  return { url: `/api/uploads/${subdir}/${fileName}`, name: file.name || safeName };
}
