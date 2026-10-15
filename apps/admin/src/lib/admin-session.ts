export const ADMIN_SESSION_COOKIE = "netphim_admin_session";
export const ADMIN_GITHUB_STATE_COOKIE = "netphim_admin_github_state";
export const ADMIN_GITHUB_VERIFIER_COOKIE = "netphim_admin_github_verifier";
export const ADMIN_GITHUB_NEXT_COOKIE = "netphim_admin_github_next";
export const ADMIN_GITHUB_CHALLENGE_COOKIE = "netphim_admin_github_challenge";

export function hasAdminSession(request: { cookies: { get(name: string): { value: string } | undefined } }) {
  return Boolean(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export function adminApiBaseUrl() {
  const configured =
    process.env.NETPHIM_API_URL ||
    process.env.CINEVERSE_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:3001/api/v1";
  try {
    const parsed = new URL(configured);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString().replace(/\/$/, "");
    }
  } catch {}
  return "http://127.0.0.1:3001/api/v1";
}

export function adminGithubCallbackUrl(origin: string) {
  return (
    process.env.ADMIN_GITHUB_CALLBACK_URL ||
    `${origin.replace(/\/$/, "")}/api/auth/github/callback`
  );
}

export function safeAdminNext(value: string | null | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function adminPublicOrigin(request?: { headers: { get(name: string): string | null } }) {
  if (process.env.ADMIN_PUBLIC_URL) {
    return process.env.ADMIN_PUBLIC_URL.replace(/\/$/, "");
  }
  if (request) {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || "https";
    if (host && !host.startsWith("0.0.0.0") && !host.startsWith("127.0.0.1")) {
      return `${proto}://${host}`;
    }
  }
  return "https://admin.flexphim.top";
}

export function isAllowedAdminOrigin(
  origin: string | null | undefined,
  request: { headers: { get(name: string): string | null }; nextUrl?: { origin?: string; host?: string } },
): boolean {
  if (!origin) return true;
  if (request.nextUrl?.origin && origin === request.nextUrl.origin) return true;
  const publicOrigin = adminPublicOrigin(request);
  if (origin === publicOrigin) return true;

  // Sec-Fetch-Site browser protection check (same-origin / same-site requests are trusted)
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "same-origin" || secFetchSite === "same-site" || secFetchSite === "none") {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const originHost = originUrl.host.toLowerCase();
    const originHostname = originUrl.hostname.toLowerCase();

    const reqHost = (
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      request.nextUrl?.host
    )?.toLowerCase();
    if (reqHost && (originHost === reqHost || originHostname === reqHost.split(":")[0])) return true;

    if (originHost === "admin.flexphim.top" || originHost.endsWith(".flexphim.top")) return true;
    if (
      originHostname === "151.242.170.31" ||
      originHostname === "localhost" ||
      originHostname === "127.0.0.1" ||
      originHostname.startsWith("192.168.") ||
      originHostname.startsWith("10.") ||
      originHostname.startsWith("172.")
    ) {
      return true;
    }
  } catch {}

  return false;
}
