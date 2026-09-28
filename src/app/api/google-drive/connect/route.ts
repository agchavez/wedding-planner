import { NextRequest, NextResponse } from "next/server";
import { DRIVE_STATE_COOKIE, getDriveRedirectUri, getGoogleAuthUrl, isGoogleDriveConfigured } from "@/lib/googleDrive";
import { getEditableWeddingId } from "@/lib/wedding";



export async function GET(request: NextRequest) {
  // Solo quien puede editar la boda activa conecta su Drive (redirige al login sin sesión).
  await getEditableWeddingId();
  if (!isGoogleDriveConfigured()) {
    return NextResponse.redirect(new URL("/fotos?error=not_configured", request.url));
  }

  // `state` aleatorio en una cookie: la callback solo acepta la respuesta de este mismo flujo.
  const state = crypto.randomUUID();
  const response = NextResponse.redirect(getGoogleAuthUrl(getDriveRedirectUri(request.url), state));
  response.cookies.set(DRIVE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/google-drive",
    maxAge: 600,
  });
  return response;
}
