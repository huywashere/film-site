import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_SECONDS = 60 * 60;

function signingSecret(): string | null {
  const configured = (
    process.env.HLS_PROXY_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET ||
    ""
  ).trim();
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV !== "production") {
    return "netphim-development-only-hls-secret-change-me";
  }
  return null;
}

function signatureFor(url: string, expiresAt: number): string {
  const secret = signingSecret();
  if (!secret) return "";
  return createHmac("sha256", secret)
    .update(`${expiresAt}\n${url}`)
    .digest("base64url");
}

export function createSignedHlsProxyUrl(
  rawUrl: string,
  expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
): string {
  const url = new URL(rawUrl).toString();
  const signature = signatureFor(url, expiresAt);
  // Keep the direct provider URL usable when a deployment forgot the optional
  // relay secret. Previously this exception invalidated the whole KKPhim API
  // payload, so no server appeared in production at all.
  if (!signature) return "";
  const search = new URLSearchParams({
    url,
    expires: String(expiresAt),
    signature,
  });
  return `/api/hls-proxy?${search.toString()}`;
}

export function verifySignedHlsProxyUrl(
  url: string,
  expiresAtRaw: string | null,
  signature: string | null,
): boolean {
  const expiresAt = Number(expiresAtRaw);
  if (
    !Number.isSafeInteger(expiresAt) ||
    expiresAt < Math.floor(Date.now() / 1000) ||
    expiresAt > Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS + 60 ||
    !signature
  ) {
    return false;
  }

  const received = Buffer.from(signature);
  const expectedValue = signatureFor(new URL(url).toString(), expiresAt);
  if (!expectedValue) return false;
  const expected = Buffer.from(expectedValue);
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}

export function addSignedHlsFallbacksInPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(addSignedHlsFallbacksInPayload);
  if (!value || typeof value !== "object") return value;

  const source = value as Record<string, unknown>;
  const result = Object.fromEntries(
    Object.entries(source).map(([key, child]) => [
      key,
      addSignedHlsFallbacksInPayload(child),
    ]),
  );

  // Browsers should fetch the provider stream directly first. Forcing every
  // byte through a serverless region is slower and some media CDNs block
  // datacenter IPs even though they allow browser playback. Keep a signed,
  // SSRF-protected proxy URL solely as a CORS/network fallback.
  const hlsUrl = source.link_m3u8;
  if (typeof hlsUrl === "string" && /^https?:\/\//i.test(hlsUrl)) {
    const proxyUrl = createSignedHlsProxyUrl(hlsUrl);
    if (proxyUrl) result.link_m3u8_proxy = proxyUrl;
  }

  return result;
}
