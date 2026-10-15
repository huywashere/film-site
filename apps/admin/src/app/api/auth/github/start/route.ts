import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_GITHUB_NEXT_COOKIE,
  ADMIN_GITHUB_STATE_COOKIE,
  ADMIN_GITHUB_VERIFIER_COOKIE,
  adminGithubCallbackUrl,
  adminPublicOrigin,
  safeAdminNext,
} from "@/lib/admin-session";

export async function GET(request: NextRequest) {
  const origin = adminPublicOrigin(request);
  const clientId = process.env.GITHUB_ADMIN_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.redirect(new URL("/login?github_error=not_configured", origin));
  }

  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(64).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const callbackUrl = adminGithubCallbackUrl(origin);
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", callbackUrl);
  authorize.searchParams.set("scope", "read:user user:email");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "S256");
  authorize.searchParams.set("allow_signup", "false");
  authorize.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authorize);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/auth/github/callback",
    maxAge: 10 * 60,
  };
  response.cookies.set(ADMIN_GITHUB_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(ADMIN_GITHUB_VERIFIER_COOKIE, verifier, cookieOptions);
  response.cookies.set(
    ADMIN_GITHUB_NEXT_COOKIE,
    safeAdminNext(request.nextUrl.searchParams.get("next")),
    cookieOptions,
  );
  return response;
}
