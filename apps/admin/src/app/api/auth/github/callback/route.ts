import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_GITHUB_CHALLENGE_COOKIE,
  ADMIN_GITHUB_NEXT_COOKIE,
  ADMIN_GITHUB_STATE_COOKIE,
  ADMIN_GITHUB_VERIFIER_COOKIE,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  adminApiBaseUrl,
  adminGithubCallbackUrl,
  adminPublicOrigin,
  safeAdminNext,
} from "@/lib/admin-session";

function equalState(received: string, expected: string) {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function clearOAuthCookies(response: NextResponse) {
  for (const name of [
    ADMIN_GITHUB_STATE_COOKIE,
    ADMIN_GITHUB_VERIFIER_COOKIE,
    ADMIN_GITHUB_NEXT_COOKIE,
  ]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      path: "/api/auth/github/callback",
      maxAge: 0,
    });
  }
}

function loginRedirect(request: NextRequest, error: string) {
  const origin = adminPublicOrigin(request);
  const target = new URL("/login", origin);
  target.searchParams.set("github_error", error);
  return NextResponse.redirect(target);
}

export async function GET(request: NextRequest) {
  const expectedState = request.cookies.get(ADMIN_GITHUB_STATE_COOKIE)?.value || "";
  const verifier = request.cookies.get(ADMIN_GITHUB_VERIFIER_COOKIE)?.value || "";
  const next = safeAdminNext(request.cookies.get(ADMIN_GITHUB_NEXT_COOKIE)?.value);
  const state = request.nextUrl.searchParams.get("state") || "";
  const code = request.nextUrl.searchParams.get("code") || "";
  if (!code || !state || !expectedState || !verifier || !equalState(state, expectedState)) {
    const response = loginRedirect(request, "invalid_state");
    clearOAuthCookies(response);
    return response;
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${adminApiBaseUrl()}/admin-auth/github`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": request.headers.get("user-agent") || "FlexPhim-Admin-GitHub",
        "X-Forwarded-For": request.headers.get("x-forwarded-for") || "",
      },
      body: JSON.stringify({
        code,
        codeVerifier: verifier,
        redirectUri: adminGithubCallbackUrl(adminPublicOrigin(request)),
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    const response = loginRedirect(request, "api_unavailable");
    clearOAuthCookies(response);
    return response;
  }

  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const response = loginRedirect(
      request,
      typeof payload.message === "string" ? payload.message.slice(0, 180) : "github_rejected",
    );
    clearOAuthCookies(response);
    return response;
  }

  if (payload.requires2FA && payload.challenge) {
    const origin = adminPublicOrigin(request);
    const target = new URL("/login", origin);
    target.searchParams.set("github_2fa", "1");
    target.searchParams.set("next", next);
    const response = NextResponse.redirect(target);
    response.cookies.set(ADMIN_GITHUB_CHALLENGE_COOKIE, payload.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth/github/complete",
      maxAge: 5 * 60,
    });
    clearOAuthCookies(response);
    return response;
  }

  if (!payload.token) {
    const response = loginRedirect(request, "missing_session");
    clearOAuthCookies(response);
    return response;
  }
  const origin = adminPublicOrigin(request);
  const response = NextResponse.redirect(new URL(next, origin));
  response.cookies.set(ADMIN_SESSION_COOKIE, payload.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
  clearOAuthCookies(response);
  return response;
}
