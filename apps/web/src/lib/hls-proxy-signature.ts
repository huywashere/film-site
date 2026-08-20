import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_SECONDS = 60 * 60;

function signingSecret(): string {
  const configured = process.env.HLS_PROXY_SECRET?.trim();
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV !== "production") {
    return "cineverse-development-only-hls-secret-change-me";
  }
  throw new Error("HLS_PROXY_SECRET must contain at least 32 characters");
}

function signatureFor(url: string, expiresAt: number): string {
  return createHmac("sha256", signingSecret())
    .update(`${expiresAt}\n${url}`)
    .digest("base64url");
}

export function createSignedHlsProxyUrl(
  rawUrl: string,
  expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
): string {
  const url = new URL(rawUrl).toString();
  const signature = signatureFor(url, expiresAt);
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
  const expected = Buffer.from(signatureFor(new URL(url).toString(), expiresAt));
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
    result.link_m3u8_proxy = createSignedHlsProxyUrl(hlsUrl);
  }

  return result;
}
