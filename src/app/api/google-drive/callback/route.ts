import { NextRequest, NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { DRIVE_STATE_COOKIE, getDriveRedirectUri, saveTokensFromCode } from "@/lib/googleDrive";
import { getEditableWeddingId } from "@/lib/wedding";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(DRIVE_STATE_COOKIE)?.value;
  const errorParam = request.nextUrl.searchParams.get("error");

  const redirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url));
    response.cookies.delete({ name: DRIVE_STATE_COOKIE, path: "/api/google-drive" });
    return response;
  };

  if (errorParam || !code) return redirect("/fotos?error=access_denied");
  if (!state || state !== expectedState) return redirect("/fotos?error=connect_failed");

  const weddingId = await getEditableWeddingId();
  try {
    const email = await saveTokensFromCode(code, getDriveRedirectUri(request.url), weddingId);
    await audit("drive.connect", `Conectó Google Drive (${email || "cuenta de Google"})`, { weddingId });
    return redirect("/fotos?connected=1");
  } catch {
    return redirect("/fotos?error=connect_failed");
  }
}
