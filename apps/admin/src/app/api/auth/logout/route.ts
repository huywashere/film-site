import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, adminApiBaseUrl } from "@/lib/admin-session";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || "";
  if (token) {
    await fetch(`${adminApiBaseUrl()}/admin-auth/logout`, {
      method: "POST",
      cache: "no-store",
      headers: { "x-admin-session-token": token },
    }).catch(() => undefined);
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
