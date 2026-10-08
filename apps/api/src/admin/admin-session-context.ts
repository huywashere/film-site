import { createHash } from "crypto";

export type AdminRequestContext = {
  ipAddress?: string;
  userAgent?: string;
};

export function normalizeAdminIp(value?: string | null) {
  const first = String(value || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (first === "::1") return "127.0.0.1";
  return first.startsWith("::ffff:") ? first.slice(7) : first;
}

export function normalizeAdminUserAgent(value?: string | null) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 1000);
}

export function normalizeAdminContext(
  context: AdminRequestContext,
): Required<AdminRequestContext> {
  return {
    ipAddress: normalizeAdminIp(context.ipAddress),
    userAgent: normalizeAdminUserAgent(context.userAgent),
  };
}

export function adminContextFingerprint(context: AdminRequestContext) {
  const normalized = normalizeAdminContext(context);
  return createHash("sha256")
    .update(`${normalized.ipAddress}\0${normalized.userAgent}`)
    .digest("hex");
}

export function shouldBindAdminIp() {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.ADMIN_SESSION_BIND_IP !== "false"
  );
}

export function adminSessionContextMatches(
  stored: AdminRequestContext,
  current: AdminRequestContext,
  bindIp = shouldBindAdminIp(),
) {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  const expected = normalizeAdminContext(stored);
  const actual = normalizeAdminContext(current);

  if (!expected.userAgent || !actual.userAgent) return false;
  if (expected.userAgent !== actual.userAgent) return false;
  if (
    bindIp &&
    (!expected.ipAddress || expected.ipAddress !== actual.ipAddress)
  ) {
    return false;
  }
  return true;
}
