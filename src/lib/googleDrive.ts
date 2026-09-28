import "server-only";
import { Readable } from "node:stream";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { getActiveWeddingId } from "@/lib/wedding";

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

export async function getDriveConnection() {
  const weddingId = await getActiveWeddingId();
  return prisma.googleDriveConnection.findFirst({ where: { weddingId } });
}

export async function disconnectGoogleDrive(weddingId: string) {
  await prisma.googleDriveConnection.deleteMany({ where: { weddingId } });
}

async function getDriveClient() {
  const connection = await getDriveConnection();
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

/** Sube un archivo a la carpeta "WeddingPlanner" del Drive conectado y lo hace visible por link. */
export async function uploadFileToDrive(file: File): Promise<{ url: string; driveFileId: string } | null> {
  const result = await getDriveClient();
  if (!result) return null;
  const { drive, connection } = result;
  const folderId = await ensureAppFolder(drive, connection.id, connection.folderId);

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

export async function deleteDriveFile(driveFileId: string) {
  const result = await getDriveClient();
  if (!result) return;
  try {
    await result.drive.files.delete({ fileId: driveFileId });
  } catch {
    // El archivo puede ya no existir o el acceso haber sido revocado — no debe bloquear el borrado local.
  }
}
