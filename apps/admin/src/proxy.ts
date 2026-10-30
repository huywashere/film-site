import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, adminPublicOrigin } from "./lib/admin-session";

export function proxy(request: NextRequest) {
  // On localhost or in development, completely disable redirects so the dev panel never jumps or loops
  const isLocal =
    process.env.NODE_ENV !== "production" ||
    request.headers.get("host")?.includes("localhost") ||
    request.headers.get("host")?.includes("127.0.0.1");

  if (isLocal) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const isLoginPage = request.nextUrl.pathname === "/login";
  const publicPath =
    isLoginPage ||
    request.nextUrl.pathname.startsWith("/api/auth/");
  const authenticated = Boolean(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);

  // If the user visits /login with session_expired or logout query, ALWAYS clear the cookie
  // and permit viewing the login page without redirect looping back to /
  if (
    isLoginPage &&
    (request.nextUrl.searchParams.has("session_expired") ||
      request.nextUrl.searchParams.has("logout"))
  ) {
    const response = NextResponse.next();
    response.cookies.set(ADMIN_SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  if (!authenticated && !publicPath) {
    const origin = adminPublicOrigin(request);
    const login = new URL("/login", origin);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  if (authenticated && isLoginPage) {
    const origin = adminPublicOrigin(request);
    return NextResponse.redirect(new URL("/", origin));
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
