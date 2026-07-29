import type { NextRequest } from "next/server";

/**
 * Best-effort client IP for rate-limiting keys.
 *
 * `X-Forwarded-For` is caller-controlled, so treat the value as untrusted
 * input: take only the left-most entry, strip any port, and reject anything
 * that isn't IP-shaped. Callers must never use this for authorization —
 * it is a spam-throttling key only.
 */
export function clientIpFromRequest(request: NextRequest): string {
  const candidates = [
    // Vercel sets this and strips client-supplied copies.
    request.headers.get("x-real-ip"),
    request.headers.get("x-forwarded-for")?.split(",")[0],
  ];

  for (const candidate of candidates) {
    const ip = normalizeIp(candidate);
    if (ip) return ip;
  }

  return "unknown";
}

function normalizeIp(value: string | null | undefined): string | null {
  if (!value) return null;

  let ip = value.trim();
  if (!ip) return null;

  // "[::1]:1234" → "::1"
  const bracketed = ip.match(/^\[(.+)\](?::\d+)?$/);
  if (bracketed) {
    ip = bracketed[1];
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) {
    // "1.2.3.4:5678" → "1.2.3.4"
    ip = ip.slice(0, ip.lastIndexOf(":"));
  }

  const isIpv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip);
  const isIpv6 = /^[0-9a-fA-F:]+$/.test(ip) && ip.includes(":");
  if (!isIpv4 && !isIpv6) return null;

  if (isIpv4 && ip.split(".").some((part) => Number(part) > 255)) return null;

  return ip.toLowerCase();
}
