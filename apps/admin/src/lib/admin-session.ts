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
    process.env.NETPHIM_API_URL || "http://127.0.0.1:3001/api/v1";
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
