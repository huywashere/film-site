import { NextRequest, NextResponse } from "next/server";

// ── Danh sách domain & keyword quảng cáo/cờ bạc cần block triệt để ──
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
  "cdn-ads",
  "ad-cdn",
  "ads-cdn",
  "banner-ads",
  "preroll",
  "midroll",
  "postroll",
  // Các domain nhà cái, cờ bạc, casino phổ biến trong stream API phim Việt
  "9922",
  "8877",
  "789bet",
  "shbet",
  "jun88",
  "hi88",
  "f8bet",
  "okvip",
  "new88",
  "bk8",
  "w88",
  "fun88",
  "12bet",
  "v9bet",
  "fb88",
  "m88",
  "78win",
  "kubet",
  "ku11",
  "kucasino",
  "thabet",
  "88online",
  "choi88",
  "win79",
  "rikvip",
  "go88",
  "sunwin",
  "b52",
  "macao",
  "tai-xiu",
  "taixiu",
  "nohu",
  "quayhu",
  "gamebai",
  "baccarat",
];

// ── Pattern nhận biết segment quảng cáo trong HLS ────────────────
const AD_SEGMENT_PATTERNS = [
  /\/ads?\//i,
  /\/advertisement\//i,
  /\/preroll\//i,
  /\/midroll\//i,
  /\/postroll\//i,
  /ad[_-]?segment/i,
  /commercial/i,
  /sponsor/i,
  /betting/i,
  /casino/i,
  /nha[_-]?cai/i,
  /quang[_-]?cao/i,
  /qc[_-]?/i,
  /banner/i,
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

// ── Filter HLS manifest, bỏ triệt để cả khối segment quảng cáo ────
function filterM3u8(content: string, originalUrl: string): string {
  const baseUrl = getBaseUrl(originalUrl);
  const proxyBase = "/api/hls-proxy?url=";
  const lines = content.split("\n");
  const filtered: string[] = [];
  let inAdBlock = false;
  let removedAds = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Bỏ qua dòng trống
    if (!line) {
      if (!inAdBlock) filtered.push("");
      continue;
    }

    // Detect #EXT-X-DISCONTINUITY (dấu hiệu chèn khối quảng cáo)
    if (line === "#EXT-X-DISCONTINUITY") {
      if (inAdBlock) {
        // Kết thúc khối quảng cáo
        inAdBlock = false;
        continue;
      }

      // Kiểm tra 15 dòng tiếp theo xem có chứa URL quảng cáo/nhà cái không
      const sliceLines = lines.slice(i + 1, i + 16);
      const isAdBlock = sliceLines.some((l) => {
        const trimmed = l.trim();
        if (!trimmed.startsWith("#") && trimmed) {
          const abs = resolveUrl(baseUrl, trimmed);
          return isAdUrl(abs);
        }
        return false;
      });

      if (isAdBlock) {
        inAdBlock = true;
        removedAds++;
        continue; // bỏ tag DISCONTINUITY mở đầu khối quảng cáo
      }
    }

    // Nếu đang trong khối quảng cáo → bỏ tất cả các dòng tới khi hết khối
    if (inAdBlock) {
      removedAds++;
      continue;
    }

    // Xử lý dòng segment (.ts, .m4s, .aac...)
    if (!line.startsWith("#")) {
      const absoluteUrl = resolveUrl(baseUrl, line);

      if (isAdUrl(absoluteUrl)) {
        removedAds++;
        continue; // bỏ segment quảng cáo lẻ
      }

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
    console.log(`[hls-proxy] Đã gỡ triệt để ${removedAds} dòng/segment quảng cáo`);
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
