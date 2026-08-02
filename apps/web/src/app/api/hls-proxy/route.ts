import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import {
  filterHlsManifest,
  isLikelyAdUrl,
  type HlsUriKind,
} from "@/lib/hls-ad-filter";

const MAX_REDIRECTS = 3;
const UPSTREAM_TIMEOUT_MS = 15_000;

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
  const parsed = new URL(value);
  if (!(["http:", "https:"] as string[]).includes(parsed.protocol)) {
    throw new Error("Giao thức không hợp lệ");
  }
  if (parsed.username || parsed.password || isPrivateHost(parsed.hostname)) {
    throw new Error("Host bị cấm");
  }

  try {
    const addresses = await lookup(parsed.hostname, { all: true, verbatim: true });
    if (addresses.length === 0 || addresses.some(({ address }) => isPrivateHost(address))) {
      throw new Error("Host bị cấm");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Host bị cấm") throw error;
    throw new Error("Không thể phân giải host");
  }
  return parsed;
}

function proxiedUrl(url: string): string {
  return `/api/hls-proxy?url=${encodeURIComponent(url)}`;
}

function rewriteManifestUri(url: string, kind: HlsUriKind): string {
  // HLS.js fetches every URI in the manifest from the browser. Keeping media
  // segments on the upstream origin made the manifest load but then failed at
  // 00:00 on providers without permissive CORS. Proxy manifests, keys and
  // segments consistently so the full stream has one same-origin contract.
  void kind;
  return proxiedUrl(url);
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
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "Thiếu tham số url" }, { status: 400 });
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
      headers: { "X-Cineverse-Ad-Blocked": "uri" },
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
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
          "X-Cineverse-Ad-Filtered": filtered ? "1" : "0",
          "X-Cineverse-Ad-Segments": String(stats.removedSegments),
          "X-Cineverse-Ad-Breaks": String(stats.detectedBreaks),
          "X-Cineverse-Ad-Reasons": stats.reasons.join(",").slice(0, 160),
        },
      });
    }

    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
        ...(response.headers.get("content-range")
          ? { "Content-Range": response.headers.get("content-range")! }
          : {}),
        ...(response.headers.get("accept-ranges")
          ? { "Accept-Ranges": response.headers.get("accept-ranges")! }
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
