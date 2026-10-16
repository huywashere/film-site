import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE_SECONDS, adminApiBaseUrl } from "@/lib/admin-session";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { message: "Chức năng này chỉ khả dụng trong môi trường phát triển (Dev)" },
      { status: 403 },
    );
  }

  let token = "dev-local-session-token";
  try {
    const upstream = await fetch(`${adminApiBaseUrl()}/admin-auth/dev-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (upstream.ok) {
      const data = await upstream.json();
      if (data?.token) token = data.token;
    }
  } catch {}

  const response = NextResponse.json({
    success: true,
    message: "Đăng nhập nhanh Local Dev thành công",
  });

  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
