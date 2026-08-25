import { UAParser } from "ua-parser-js";

export type SessionContext = {
  userAgent?: string | null;
  ipAddress?: string | null;
};

export function normalizeSessionIp(value?: string | null): string {
  const ip = String(value || "").trim().toLowerCase();
  if (ip === "::1") return "127.0.0.1";
  return ip.replace(/^::ffff:/, "");
}

export function sessionUserAgentFingerprint(value?: string | null): string {
  if (!value) return "";
  const parser = new UAParser(value);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();
  return [browser.name, os.name, device.type, device.vendor, device.model]
    .map((part) => String(part || "").trim().toLowerCase())
    .join("|");
}

export function sessionContextMatches(
  stored: SessionContext,
  current: SessionContext,
  bindIp = false,
): boolean {
  const storedAgent = sessionUserAgentFingerprint(stored.userAgent);
  const currentAgent = sessionUserAgentFingerprint(current.userAgent);
  if (storedAgent && storedAgent !== currentAgent) return false;

  if (bindIp) {
    const storedIp = normalizeSessionIp(stored.ipAddress);
    const currentIp = normalizeSessionIp(current.ipAddress);
    if (storedIp && storedIp !== currentIp) return false;
  }
  return true;
}
