import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Chequeo optimista: si no hay cookie de sesión, redirige al login. La validación real
 * de la sesión ocurre en el servidor (requireSession / getActiveWeddingId).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  // Login, registro, landing, enlaces de invitación y los enlaces compartidos (agenda de un
  // evento y galería de fotos, de solo lectura) son públicos. Una cookie vencida no debe
  // impedir llegar al login (evita bucles de redirección);
  // la propia página de login redirige al panel si la sesión es válida.
  if (
    pathname === "/login" ||
    pathname === "/registro" ||
    pathname === "/inicio" ||
    pathname.startsWith("/invitacion/") ||
    pathname.startsWith("/agenda/") ||
    pathname.startsWith("/galeria/")
  )
    return NextResponse.next();

  // Sin sesión, la raíz muestra la landing pública; con sesión, el panel de la boda.
  if (pathname === "/" && !hasSession) return NextResponse.rewrite(new URL("/inicio", request.url));

  if (!hasSession) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
