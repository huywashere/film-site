import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "./lib/admin-session";

export function proxy(request: NextRequest) {
  const publicPath =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname.startsWith("/api/auth/");
  const authenticated = Boolean(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (!authenticated && !publicPath) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  if (authenticated && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.next();
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
