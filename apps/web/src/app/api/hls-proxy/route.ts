import { NextRequest, NextResponse } from "next/server";

// ── Danh sách domain quảng cáo cần block ─────────────────────────
const AD_DOMAINS = [
  "googlesyndication",
  "doubleclick",
  "googleadservices",
  "adservice",
  "ads.google",
  "pagead",
  "adnxs",
  "advertising",
  "adserver",
  "adtech",
  "adsystem",
  "adform",
  "adroll",
  "criteo",
  "taboola",
  "outbrain",
  "revcontent",
  "mgid",
  "propellerads",
  "popcash",
  "popads",
  "exoclick",
  "trafficjunky",
  "juicyads",
  "hilltopads",
  "adsterra",
  "clickadu",
  "richpush",
  "pushground",
  "evadav",
  "zeropark",
  "admaven",
  "adcash",
  "bidvertiser",
  "yllix",
  "adf.ly",
  "shorte.st",
  "ouo.io",
  // Các domain quảng cáo phổ biến trong stream phim Việt
  "cdn-ads",
  "ad-cdn",
  "ads-cdn",
  "banner-ads",
  "preroll",
  "midroll",
  "postroll",
];

// ── Pattern nhận biết segment quảng cáo trong HLS ────────────────
const AD_SEGMENT_PATTERNS = [
  /\/ads?\//i,
  /\/advertisement\//i,
  /\/preroll\//i,
  /\/midroll\//i,
  /\/postroll\//i,
  /ad[_-]segment/i,
  /commercial/i,
  /sponsor/i,
];

// ── Kiểm tra URL có phải quảng cáo không ─────────────────────────
function isAdUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (AD_DOMAINS.some((d) => lower.includes(d))) return true;
  if (AD_SEGMENT_PATTERNS.some((p) => p.test(url))) return true;
  return false;
}

// ── Resolve URL tương đối thành tuyệt đối ────────────────────────
function resolveUrl(base: string, relative: string): string {
  if (relative.startsWith("http://") || relative.startsWith("https://")) {
    return relative;
  }
  try {
    return new URL(relative, base).toString();
  } catch {
    return relative;
  }
}

// ── Lấy base URL từ m3u8 URL ─────────────────────────────────────
function getBaseUrl(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/");
    parts.pop(); // bỏ filename
    return `${u.protocol}//${u.host}${parts.join("/")}`;
  } catch {
    return url;
  }
}

// ── Filter HLS manifest, bỏ segment quảng cáo ────────────────────
function filterM3u8(content: string, originalUrl: string): string {
  const baseUrl = getBaseUrl(originalUrl);
  const proxyBase = "/api/hls-proxy?url=";
  const lines = content.split("\n");
  const filtered: string[] = [];
  let skipNext = false;
  let removedAds = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Bỏ qua dòng trống
    if (!line) {
      filtered.push("");
      continue;
    }

    // Xử lý EXT-X-DISCONTINUITY (dấu hiệu chèn quảng cáo)
    if (line === "#EXT-X-DISCONTINUITY") {
      // Kiểm tra segment tiếp theo có phải quảng cáo không
      const nextSegment = lines
        .slice(i + 1)
        .find((l) => !l.startsWith("#") && l.trim());
      if (nextSegment && isAdUrl(resolveUrl(baseUrl, nextSegment.trim()))) {
        skipNext = true;
        removedAds++;
        continue; // bỏ DISCONTINUITY tag
      }
    }

    // Xử lý dòng segment (.ts, .m4s, .aac...)
    if (!line.startsWith("#")) {
      const absoluteUrl = resolveUrl(baseUrl, line);

      if (skipNext || isAdUrl(absoluteUrl)) {
        skipNext = false;
        removedAds++;
        continue; // bỏ segment quảng cáo
      }

      skipNext = false;
      // Proxy segment qua server để tránh CORS
      filtered.push(`${proxyBase}${encodeURIComponent(absoluteUrl)}`);
      continue;
    }

    // Xử lý URI trong các tag HLS
    if (line.includes("URI=")) {
      const uriMatch = line.match(/URI="([^"]+)"/);
      if (uriMatch) {
        const uri = uriMatch[1];
        const absoluteUri = resolveUrl(baseUrl, uri);
        if (isAdUrl(absoluteUri)) {
          removedAds++;
          continue;
        }
        // Proxy URI
        const proxiedLine = line.replace(
          `URI="${uri}"`,
          `URI="${proxyBase}${encodeURIComponent(absoluteUri)}"`,
        );
        filtered.push(proxiedLine);
        continue;
      }
    }

    // Xử lý playlist con (master m3u8 → variant streams)
    if (
      line.startsWith("#EXT-X-STREAM-INF") ||
      line.startsWith("#EXT-X-MEDIA")
    ) {
      filtered.push(line);
      // Dòng tiếp theo là URL của variant
      const nextLine = lines[i + 1]?.trim();
      if (nextLine && !nextLine.startsWith("#")) {
        i++;
        const absoluteUrl = resolveUrl(baseUrl, nextLine);
        filtered.push(`${proxyBase}${encodeURIComponent(absoluteUrl)}`);
        continue;
      }
      continue;
    }

    // Giữ nguyên các tag HLS khác
    filtered.push(line);
  }

  if (removedAds > 0) {
    console.log(`[hls-proxy] Đã block ${removedAds} segment quảng cáo`);
  }

  return filtered.join("\n");
}

// ── Main handler ──────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Thiếu tham số url" }, { status: 400 });
  }

  // Decode URL
  let targetUrl: string;
  try {
    targetUrl = decodeURIComponent(url);
  } catch {
    targetUrl = url;
  }

  // Block nếu URL là quảng cáo
  if (isAdUrl(targetUrl)) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Referer: new URL(targetUrl).origin,
        Origin: new URL(targetUrl).origin,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return new NextResponse(null, { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "";
    const isM3u8 =
      contentType.includes("mpegurl") ||
      contentType.includes("x-mpegurl") ||
      targetUrl.includes(".m3u8");

    if (isM3u8) {
      // Filter manifest để bỏ quảng cáo
      const text = await response.text();
      const filtered = filterM3u8(text, targetUrl);

      return new NextResponse(filtered, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        },
      });
    }

    // Với segment video (.ts, .m4s...) - stream thẳng qua
    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType || "video/mp2t",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[hls-proxy] error:", msg);
    return new NextResponse(null, { status: 502 });
  }
}
