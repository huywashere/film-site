import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, adminApiBaseUrl } from "@/lib/admin-session";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ message: "Nguồn yêu cầu không hợp lệ" }, { status: 403 });
  }
  const body = await request.text();
  let upstream: Response;
  try {
    upstream = await fetch(`${adminApiBaseUrl()}/admin-auth/login`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": request.headers.get("user-agent") || "NetPhim-Admin-Login",
        "X-Forwarded-For": request.headers.get("x-forwarded-for") || "",
      },
      body,
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return NextResponse.json({ message: "Không thể kết nối API xác thực" }, { status: 502 });
  }
  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok || !payload.token) {
    return NextResponse.json(payload, { status: upstream.status });
  }
  const response = NextResponse.json({
    success: true,
    user: payload.user,
    expiresAt: payload.expiresAt,
  });
  response.cookies.set(ADMIN_SESSION_COOKIE, payload.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return response;
}
