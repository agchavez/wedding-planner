import "server-only";
import { Readable } from "node:stream";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";
import { MEDIA_FOLDERS, type MediaFolder } from "@/lib/mediaFolders";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
];
const APP_FOLDER_NAME = "WeddingPlanner";

/** Cookie con el `state` del flujo OAuth en curso (protege la callback contra CSRF). */
export const DRIVE_STATE_COOKIE = "gdrive_oauth_state";

export function isGoogleDriveConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function createOAuthClient(redirectUri?: string) {
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri);
}

/**
 * Callback de OAuth. Usa la URL pública de la app (BETTER_AUTH_URL): detrás del proxy
 * (Caddy), `request.url` apunta al contenedor y no coincide con la registrada en Google.
 * Registrar en Google Cloud: <BETTER_AUTH_URL>/api/google-drive/callback
 */
export function getDriveRedirectUri(requestUrl: string): string {
  return new URL("/api/google-drive/callback", process.env.BETTER_AUTH_URL || requestUrl).toString();
}

/** URL de consentimiento de Google a la que se redirige al usuario para conectar su Drive. */
export function getGoogleAuthUrl(redirectUri: string, state: string): string {
  const client = createOAuthClient(redirectUri);
  return client.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: SCOPES, state });
}

/** Intercambia el código de la callback de Google por tokens y guarda la conexión de la boda. */
export async function saveTokensFromCode(code: string, redirectUri: string, weddingId: string) {
  const client = createOAuthClient(redirectUri);
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ auth: client, version: "v2" });
  const { data: userInfo } = await oauth2.userinfo.get();

  const existing = await prisma.googleDriveConnection.findFirst({ where: { weddingId } });

  const data = {
    weddingId,
    accountEmail: userInfo.email ?? "",
    accessToken: tokens.access_token ?? existing?.accessToken ?? "",
    // Google solo manda refresh_token la primera vez que el usuario autoriza (prompt=consent lo fuerza).
    refreshToken: tokens.refresh_token ?? existing?.refreshToken ?? "",
    expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
  };

  if (existing) {
    await prisma.googleDriveConnection.update({ where: { id: existing.id }, data });
  } else {
    await prisma.googleDriveConnection.create({ data });
  }
  return data.accountEmail;
}

/** Sin weddingId usa la boda activa de la sesión; el servidor MCP pasa la del token. */
export async function getDriveConnection(weddingId?: string) {
  weddingId ??= await getActiveWeddingId();
  return prisma.googleDriveConnection.findFirst({ where: { weddingId } });
}

export async function disconnectGoogleDrive(weddingId: string) {
  await prisma.googleDriveConnection.deleteMany({ where: { weddingId } });
}

async function getDriveClient(weddingId?: string) {
  const connection = await getDriveConnection(weddingId);
  if (!connection || !connection.refreshToken) return null;

  const client = createOAuthClient();
  client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    expiry_date: connection.expiryDate?.getTime(),
  });

  client.on("tokens", (tokens) => {
    prisma.googleDriveConnection
      .update({
        where: { id: connection.id },
        data: {
          ...(tokens.access_token ? { accessToken: tokens.access_token } : {}),
          ...(tokens.expiry_date ? { expiryDate: new Date(tokens.expiry_date) } : {}),
        },
      })
      .catch(() => {});
  });

  return { drive: google.drive({ version: "v3", auth: client }), connection };
}

async function ensureAppFolder(drive: ReturnType<typeof google.drive>, connectionId: string, folderId: string | null) {
  if (folderId) return folderId;
  const res = await drive.files.create({
    requestBody: { name: APP_FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" },
    fields: "id",
  });
  const newFolderId = res.data.id;
  if (!newFolderId) throw new Error("No se pudo crear la carpeta en Google Drive.");
  await prisma.googleDriveConnection.update({ where: { id: connectionId }, data: { folderId: newFolderId } });
  return newFolderId;
}

type Drive = ReturnType<typeof google.drive>;
type Connection = NonNullable<Awaited<ReturnType<typeof getDriveConnection>>>;

/** Subcarpeta (Invitación, Fotos de la boda, Otros) dentro de "WeddingPlanner"; se crea la primera vez. */
async function ensureSubfolder(drive: Drive, connection: Connection, folder: MediaFolder) {
  const parentId = await ensureAppFolder(drive, connection.id, connection.folderId);
  const known = (connection.subfolderIds ?? {}) as Record<string, string>;
  if (known[folder]) {
    try {
      const existing = await drive.files.get({ fileId: known[folder], fields: "id, trashed" });
      if (existing.data.id && !existing.data.trashed) return known[folder];
    } catch {
      // Se borró desde Drive: se vuelve a crear.
    }
  }
  const name = MEDIA_FOLDERS.find((f) => f.key === folder)!.driveName;
  const res = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
    fields: "id",
  });
  const id = res.data.id;
  if (!id) throw new Error("No se pudo crear la carpeta en Google Drive.");
  const fresh = await prisma.googleDriveConnection.findUnique({ where: { id: connection.id }, select: { subfolderIds: true } });
  const merged = { ...((fresh?.subfolderIds ?? {}) as Record<string, string>), [folder]: id };
  await prisma.googleDriveConnection.update({ where: { id: connection.id }, data: { subfolderIds: merged } });
  connection.subfolderIds = merged;
  return id;
}

/** Enlace para abrir en Drive la carpeta de cada sección (solo las que ya existen). */
export function driveFolderLinks(connection: { subfolderIds?: unknown } | null): Partial<Record<MediaFolder, string>> {
  const known = (connection?.subfolderIds ?? {}) as Record<string, string>;
  return Object.fromEntries(
    Object.entries(known).map(([key, id]) => [key, `https://drive.google.com/drive/folders/${id}`])
  ) as Partial<Record<MediaFolder, string>>;
}

/**
 * Sube un archivo a la subcarpeta indicada de "WeddingPlanner" en el Drive conectado y lo hace
 * visible por link.
 */
export async function uploadFileToDrive(
  file: File,
  weddingId?: string,
  folder: MediaFolder = "otros"
): Promise<{ url: string; driveFileId: string } | null> {
  const result = await getDriveClient(weddingId);
  if (!result) return null;
  const { drive, connection } = result;
  const folderId = await ensureSubfolder(drive, connection, folder);

  const buffer = Buffer.from(await file.arrayBuffer());
  const created = await drive.files.create({
    requestBody: { name: file.name, parents: [folderId] },
    media: { mimeType: file.type || "application/octet-stream", body: Readable.from(buffer) },
    fields: "id",
  });

  const fileId = created.data.id;
  if (!fileId) return null;

  await drive.permissions.create({ fileId, requestBody: { role: "reader", type: "anyone" } });
  const fresh = await drive.files.get({ fileId, fields: "webViewLink" });

  return { url: fresh.data.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`, driveFileId: fileId };
}

/** Mueve un archivo de Drive a la subcarpeta indicada (quitándolo de las demás). */
export async function moveDriveFile(driveFileId: string, folder: MediaFolder, weddingId?: string) {
  const result = await getDriveClient(weddingId);
  if (!result) return;
  const { drive, connection } = result;
  const target = await ensureSubfolder(drive, connection, folder);
  const current = await drive.files.get({ fileId: driveFileId, fields: "parents" });
  const remove = (current.data.parents ?? []).filter((p) => p !== target).join(",");
  await drive.files.update({ fileId: driveFileId, addParents: target, ...(remove ? { removeParents: remove } : {}), fields: "id" });
}

export async function deleteDriveFile(driveFileId: string, weddingId?: string) {
  const result = await getDriveClient(weddingId);
  if (!result) return;
  try {
    await result.drive.files.delete({ fileId: driveFileId });
  } catch {
    // El archivo puede ya no existir o el acceso haber sido revocado — no debe bloquear el borrado local.
  }
}
