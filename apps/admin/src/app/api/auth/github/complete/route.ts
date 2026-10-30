import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_GITHUB_CHALLENGE_COOKIE,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  adminApiBaseUrl,
  adminPublicOrigin,
  isAllowedAdminOrigin,
} from "@/lib/admin-session";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && !isAllowedAdminOrigin(origin, request)) {
    return NextResponse.json({ message: "Nguồn yêu cầu không hợp lệ" }, { status: 403 });
  }
  const challenge = request.cookies.get(ADMIN_GITHUB_CHALLENGE_COOKIE)?.value || "";
  const body = (await request.json().catch(() => ({}))) as { code?: string };
  if (!challenge || !body.code) {
    return NextResponse.json({ message: "Phiên GitHub 2FA đã hết hạn" }, { status: 401 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${adminApiBaseUrl()}/admin-auth/github/complete`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": request.headers.get("user-agent") || "FlexPhim-Admin-GitHub-2FA",
        "X-Forwarded-For": request.headers.get("x-forwarded-for") || "",
      },
      body: JSON.stringify({ challenge, code: body.code }),
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return NextResponse.json({ message: "Không thể kết nối API xác thực" }, { status: 502 });
  }
  const payload = await upstream.json().catch(() => ({}));
  const response = NextResponse.json(
    upstream.ok ? { success: true, user: payload.user } : payload,
    { status: upstream.status },
  );
  response.cookies.set(ADMIN_GITHUB_CHALLENGE_COOKIE, "", {
    httpOnly: true,
    path: "/api/auth/github/complete",
    maxAge: 0,
  });
  if (upstream.ok && payload.token) {
    response.cookies.set(ADMIN_SESSION_COOKIE, payload.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });
  }
  return response;
}
