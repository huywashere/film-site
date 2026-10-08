import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "./lib/admin-session";

export function proxy(request: NextRequest) {
  const publicPath =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname.startsWith("/api/auth/") ||
    request.nextUrl.pathname.startsWith("/api/admin/");

  let sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || "";
  let autoDevAuthenticated = false;

  // In development, auto-authenticate developers seamlessly
  if (!sessionToken && process.env.NODE_ENV !== "production") {
    sessionToken = "dev-local-session-token";
    autoDevAuthenticated = true;
  }

  const authenticated = Boolean(sessionToken);

  if (!authenticated && !publicPath) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  if (authenticated && !autoDevAuthenticated && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.next();
  if (autoDevAuthenticated) {
    response.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  }

  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}

export const config = {
  // Large video bodies must reach the streaming route handler without being
  // cloned/buffered by Proxy. That handler performs its own session + origin checks.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/admin/media/uploads).*)"],
};
