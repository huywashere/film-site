import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import {
  filterHlsManifest,
  isLikelyAdUrl,
  type HlsUriKind,
} from "@/lib/hls-ad-filter";
import {
  createSignedHlsProxyUrl,
  verifySignedHlsProxyUrl,
} from "@/lib/hls-proxy-signature";
import { checkHlsProxyRateLimitDistributed } from "@/lib/server-rate-limiter";
import { clientIpFromRequest } from "@/lib/client-ip";

const MAX_REDIRECTS = 3;
// Reduced from 15s → 10s so a dead CDN node fails fast and HLS.js retries the
// next quality level instead of stalling the player for 15 seconds.
const UPSTREAM_TIMEOUT_MS = 10_000;

// ── In-process DNS result cache (TTL: 5 min) ─────────────────────────────────
// Each segment request previously paid a full DNS round-trip. Caching resolved
// addresses in-process eliminates 50–300 ms per HLS segment on cold requests.
const DNS_CACHE = new Map<string, { addresses: string[]; expiresAt: number }>();
const DNS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function resolveHostCached(hostname: string): Promise<string[]> {
  const now = Date.now();
  const cached = DNS_CACHE.get(hostname);
  if (cached && cached.expiresAt > now) return cached.addresses;

  const results = await lookup(hostname, { all: true, verbatim: true });
  const addresses = results.map((r) => r.address);
  DNS_CACHE.set(hostname, { addresses, expiresAt: now + DNS_CACHE_TTL_MS });
  return addresses;
}

const DEFAULT_ALLOWED_HOST_PATTERNS = [
  "*.phimapi.com",
  "*.kkphimplayer*.com",
  "*.ophim.live",
  "*.ophim1.com",
  "*.opstream*.com",
  "*.nguonc.com",
  "*.streamc.xyz",
  "*.hihihoho*.top",
  "*.vsmov.com",
  "*.streamvsmov.com",
  "vicdn.cc",
  "*.vicdn.cc",
];

function hostIsAllowed(hostname: string): boolean {
  const configured = (process.env.HLS_PROXY_ALLOWED_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (process.env.NODE_ENV !== "production" && configured.length === 0) return true;
  const patterns = configured.length > 0 ? configured : DEFAULT_ALLOWED_HOST_PATTERNS;
  const host = hostname.toLowerCase();
  return patterns.some((pattern) => {
    if (pattern.includes("*")) {
      const regex = new RegExp(
        `^${pattern.replace(/\./g, "\\.").replace(/\*/g, ".*")}$`,
      );
      return regex.test(host);
    }
    return host === pattern;
  });
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }
  return (
    /^10\./.test(host) ||
    /^127\./.test(host) ||
    /^0\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
    /^(?:fc|fd)[0-9a-f]{2}:/i.test(host) ||
    /^fe[89ab][0-9a-f]:/i.test(host) ||
    /^::ffff:(?:0:)?(?:127|10|192\.168|172\.(?:1[6-9]|2[0-9]|3[0-1]))\./i.test(host)
  );
}

async function validateTargetUrl(value: string): Promise<URL> {
  if (value.length > 4096) throw new Error("URL quá dài");
  const parsed = new URL(value);
  if (!(["http:", "https:"] as string[]).includes(parsed.protocol)) {
    throw new Error("Giao thức không hợp lệ");
  }
  if (parsed.username || parsed.password || isPrivateHost(parsed.hostname)) {
    throw new Error("Host bị cấm");
  }
  if (parsed.port && !["80", "443"].includes(parsed.port)) {
    throw new Error("Cổng không hợp lệ");
  }
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    throw new Error("Media production phải dùng HTTPS");
  }
  if (!hostIsAllowed(parsed.hostname)) {
    throw new Error("Host media chưa được cho phép");
  }

  const hostname = parsed.hostname.toLowerCase();
  try {
    // Use the in-process DNS cache to avoid a network round-trip on every
    // segment request. A fresh lookup still happens when the entry expires.
    const addresses = await resolveHostCached(hostname);
    if (
      addresses.length === 0 ||
      addresses.some((address) => isPrivateHost(address))
    ) {
      throw new Error("Host bị cấm");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Host bị cấm") throw error;
    throw new Error("Không thể phân giải host");
  }
  return parsed;
}

function rewriteManifestUri(url: string, kind: HlsUriKind): string {
  void kind;
  return createSignedHlsProxyUrl(url);
}

async function fetchUpstream(
  initialUrl: URL,
  rangeHeader?: string | null,
): Promise<{ response: Response; finalUrl: string }> {
  let currentUrl = initialUrl;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const response = await fetch(currentUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Referer: currentUrl.origin,
        Origin: currentUrl.origin,
        ...(rangeHeader ? { Range: rangeHeader } : {}),
      },
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (response.status < 300 || response.status >= 400) {
      return { response, finalUrl: currentUrl.toString() };
    }

    const location = response.headers.get("location");
    if (!location || redirects === MAX_REDIRECTS) {
      throw new Error("Upstream chuyển hướng không hợp lệ");
    }
    currentUrl = await validateTargetUrl(new URL(location, currentUrl).toString());
  }

  throw new Error("Quá nhiều lần chuyển hướng");
}

export async function GET(request: NextRequest) {
  const rateCheck = await checkHlsProxyRateLimitDistributed(
    clientIpFromRequest(request),
  );
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: "Quá nhiều yêu cầu media" }, { status: 429 });
  }

  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "Thiếu tham số url" }, { status: 400 });
  }

  try {
    if (
      !verifySignedHlsProxyUrl(
        rawUrl,
        request.nextUrl.searchParams.get("expires"),
        request.nextUrl.searchParams.get("signature"),
      )
    ) {
      return NextResponse.json({ error: "Chữ ký media không hợp lệ" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Chữ ký media không hợp lệ" }, { status: 401 });
  }

  let targetUrl: URL;
  try {
    targetUrl = await validateTargetUrl(rawUrl);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "URL không hợp lệ" },
      { status: 400 },
    );
  }

  if (isLikelyAdUrl(targetUrl.toString())) {
    return new NextResponse(null, {
      status: 204,
      headers: { "X-NetPhim-Ad-Blocked": "uri" },
    });
  }

  try {
    const { response, finalUrl } = await fetchUpstream(
      targetUrl,
      request.headers.get("range"),
    );
    if (!response.ok && response.status !== 206) {
      return new NextResponse(null, { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "";
    const pathname = new URL(finalUrl).pathname.toLowerCase();
    const isManifest =
      contentType.includes("mpegurl") ||
      contentType.includes("x-mpegurl") ||
      pathname.endsWith(".m3u8") ||
      pathname.endsWith(".m3u");

    if (isManifest) {
      const sourceManifest = await response.text();
      const { manifest, stats } = filterHlsManifest(
        sourceManifest,
        finalUrl,
        rewriteManifestUri,
      );
      const filtered =
        stats.removedSegments + stats.removedTags + stats.removedUris > 0;

      return new NextResponse(manifest, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-store",
          "X-NetPhim-Ad-Filtered": filtered ? "1" : "0",
          "X-NetPhim-Ad-Segments": String(stats.removedSegments),
          "X-NetPhim-Ad-Breaks": String(stats.detectedBreaks),
          "X-NetPhim-Ad-Reasons": stats.reasons.join(",").slice(0, 160),
        },
      });
    }

    // Stream media bytes directly to the browser with public immutable edge caching
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
        ...(response.headers.get("content-range")
          ? { "Content-Range": response.headers.get("content-range")! }
          : {}),
        ...(response.headers.get("accept-ranges")
          ? { "Accept-Ranges": response.headers.get("accept-ranges")! }
          : {}),
        ...(response.headers.get("content-length")
          ? { "Content-Length": response.headers.get("content-length")! }
          : {}),
        ...(response.headers.get("etag")
          ? { ETag: response.headers.get("etag")! }
          : {}),
      },
    });
  } catch (error) {
    console.warn(
      "[hls-proxy] upstream error:",
      error instanceof Error ? error.message : String(error),
    );
    return new NextResponse(null, { status: 502 });
  }
}
