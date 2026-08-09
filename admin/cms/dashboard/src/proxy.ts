import { NextRequest, NextResponse } from "next/server";
import {
  adminUnauthorizedResponse,
  isAdminRequestAuthorized,
} from "./lib/admin-auth";

export function proxy(request: NextRequest) {
  if (!isAdminRequestAuthorized(request)) return adminUnauthorizedResponse();

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
