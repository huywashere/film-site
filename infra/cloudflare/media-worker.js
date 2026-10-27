/**
 * Cloudflare Edge Media Gateway Worker (FlexPhim)
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. HLS Stream & Video Chunk Proxy (/hls, /hls-proxy):
 *    - Ad-filtering for .m3u8 playlists at Edge
 *    - URL rewriting for seamless segment delivery
 *    - 24h Edge Caching for immutable .ts / .m4s video chunks (0 byte VPS bandwidth)
 *    - Full Range header support for seeking and scrubber sprites
 * 
 * 2. Image Proxy & WebP Caching (/image, /image-proxy):
 *    - CORS-safe remote image proxying (TMDB, PhimImg, OPhim, NguonC, ViCDN, etc.)
 *    - 30-day Edge Caching on Cloudflare Global PoPs
 *    - Fallback candidate support
 * 
 * 3. Subtitles Relay & VTT Converter (/subtitles):
 *    - Subtitle relay with auto SRT to WebVTT conversion
 *    - 30-day Edge Caching
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Allowed Host Patterns for Security & SSRF Protection ─────────────────────
const ALLOWED_STREAM_HOSTS = [
  "*.phimapi.com",
  "*.kkphimplayer*.com",
  "*.phim1280.tv",
  "phim1280.tv",
  "*.ophim.live",
  "*.ophim1.com",
  "*.opstream*.com",
  "*.nguonc.com",
  "*.streamc.xyz",
  "*.hihihoho*.top",
  "*.vsmov.com",
  "*.streamvsmov.com",
  "*.vsphim.com",
  "vsphim.com",
  "vicdn.cc",
  "*.vicdn.cc",
  "*.kvp*.com",
  "kvp*.com",
  "*.kvp726.com",
  "kvp726.com",
  "*.onflixcdn.com",
  "*.xink.pro",
  "*.vidsrc.*",
  "*.2embed.*",
  "*.vidlink.*",
];

const ALLOWED_IMAGE_HOSTS = [
  "image.tmdb.org",
  "phimimg.com",
  "img.ophim.live",
  "ophim1.com",
  "images.nguonc.com",
  "phim.nguonc.com",
  "img.nguonc.com",
  "vsmov.com",
  "storage.vsmov.com",
  "node-img-akm-cache.onflixcdn.com",
  "onflixcdn.com",
  "xink.pro",
  "vicdn.cc",
  "wsrv.nl",
  "i.imgur.com",
];

const AD_HOST_PATTERNS = [
  /(?:^|[/_.,?=&-])(ads?|advert(?:isement|ising)?|commercial|preroll|midroll|postroll|sponsor(?:ed)?|betting|casino|nha-?cai|quang-?cao|convertv8)(?:$|[/_.,?=&-])/i,
  /(?:\/v8\/[a-f0-9]{20,})/i,
];

function isPrivateIpOrHost(hostname) {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "::1" ||
    h.startsWith("10.") ||
    h.startsWith("192.168.") ||
    h.startsWith("169.254.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)
  );
}

function matchHostPattern(host, patterns) {
  const h = host.toLowerCase();
  return patterns.some((p) => {
    if (p.includes("*")) {
      const regex = new RegExp("^" + p.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$", "i");
      return regex.test(h);
    }
    return h === p || h.endsWith("." + p);
  });
}

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Range, Content-Type, Accept, User-Agent, X-Requested-With",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, X-Worker-Cache",
    ...extra,
  };
}

// ── 1. HLS Stream & Segment Relay ───────────────────────────────────────────
function isLikelyAdUrl(url) {
  return AD_HOST_PATTERNS.some((pattern) => pattern.test(url));
}

function resolveUrl(baseUrl, relative) {
  try {
    return new URL(relative, baseUrl).toString();
  } catch {
    return relative;
  }
}

function rewriteHlsManifest(content, originalUrl, workerUrl) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const output = [];
  let inAdBreak = false;
  let skipNextSegment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Filter ad tags
    if (line.startsWith("#EXT-X-CUE-OUT")) {
      inAdBreak = true;
      continue;
    }
    if (line.startsWith("#EXT-X-CUE-IN")) {
      inAdBreak = false;
      skipNextSegment = false;
      continue;
    }
    if (line.startsWith("#EXT-X-DATERANGE:")) {
      if (line.includes("ad") || line.includes("splice") || line.includes("commercial")) {
        continue;
      }
    }

    if (line.startsWith("#EXT-X-DISCONTINUITY")) {
      // Keep discontinuity unless explicitly inside an ad break
      if (inAdBreak) continue;
      output.push(line);
      continue;
    }

    if (line.startsWith("#EXT-X-KEY:") || line.startsWith("#EXT-X-MAP:")) {
      // Rewrite URI attribute
      const rewritten = line.replace(/URI="([^"]+)"/, (m, uri) => {
        const absUri = resolveUrl(originalUrl, uri);
        if (isLikelyAdUrl(absUri)) return 'URI=""';
        return `URI="${workerUrl}/hls?url=${encodeURIComponent(absUri)}"`;
      });
      output.push(rewritten);
      continue;
    }

    if (line.startsWith("#EXTINF:")) {
      const nextLine = lines[i + 1]?.trim() || "";
      const absNext = resolveUrl(originalUrl, nextLine);
      if (inAdBreak || isLikelyAdUrl(absNext)) {
        skipNextSegment = true;
        continue;
      }
      skipNextSegment = false;
      output.push(line);
      continue;
    }

    if (line.startsWith("#")) {
      output.push(line);
      continue;
    }

    // URI Line (manifest or segment)
    if (skipNextSegment) {
      skipNextSegment = false;
      continue;
    }

    const absoluteSegmentUrl = resolveUrl(originalUrl, line);
    if (isLikelyAdUrl(absoluteSegmentUrl)) {
      continue;
    }

    // Rewrite to pass through Worker
    const proxyUrl = `${workerUrl}/hls?url=${encodeURIComponent(absoluteSegmentUrl)}`;
    output.push(proxyUrl);
  }

  return output.join("\n");
}

async function handleHls(request, env, ctx, workerUrl) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "Missing 'url' query parameter" }), {
      status: 400,
      headers: corsHeaders({ "Content-Type": "application/json" }),
    });
  }

  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid target URL" }), {
      status: 400,
      headers: corsHeaders({ "Content-Type": "application/json" }),
    });
  }

  if (isPrivateIpOrHost(parsedTarget.hostname)) {
    return new Response(JSON.stringify({ error: "Private network access forbidden" }), {
      status: 403,
      headers: corsHeaders({ "Content-Type": "application/json" }),
    });
  }

  const isManifest = /\.m3u8(?:$|\?)/i.test(parsedTarget.pathname);
  const isSegment = /\.(?:ts|m4s|mp4|aac|ac3|ec3)(?:$|\?)/i.test(parsedTarget.pathname);

  const cache = caches.default;
  // Unique cache key per target URL (and Range if present for segments)
  const rangeHeader = request.headers.get("Range");
  const cacheKeyUrl = new URL(request.url);
  if (rangeHeader) {
    cacheKeyUrl.searchParams.set("__range", rangeHeader);
  }
  const cacheKey = new Request(cacheKeyUrl.toString(), { method: "GET" });

  // Only check edge cache for video segments (chunks are immutable)
  if (isSegment) {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      const resp = new Response(cachedResponse.body, cachedResponse);
      resp.headers.set("X-Worker-Cache", "HIT");
      resp.headers.set("Access-Control-Allow-Origin", "*");
      return resp;
    }
  }

  const upstreamHeaders = new Headers();
  upstreamHeaders.set(
    "User-Agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  );
  upstreamHeaders.set("Accept", "*/*");
  if (rangeHeader) {
    upstreamHeaders.set("Range", rangeHeader);
  }

  // Preserve referer context for known streaming CDNs
  upstreamHeaders.set("Referer", `${parsedTarget.protocol}//${parsedTarget.hostname}/`);
  upstreamHeaders.set("Origin", `${parsedTarget.protocol}//${parsedTarget.hostname}`);

  const upstreamRes = await fetch(targetUrl, {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers: upstreamHeaders,
    redirect: "follow",
  });

  if (!upstreamRes.ok) {
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: corsHeaders({
        "Content-Type": upstreamRes.headers.get("Content-Type") || "text/plain",
      }),
    });
  }

  if (isManifest) {
    const content = await upstreamRes.text();
    const rewritten = rewriteHlsManifest(content, targetUrl, workerUrl);
    return new Response(rewritten, {
      status: 200,
      headers: corsHeaders({
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "public, max-age=15, s-maxage=30", // short cache for playlists
        "X-Worker-Filtered": "true",
      }),
    });
  }

  // Video segment chunk
  const responseHeaders = corsHeaders({
    "Content-Type": upstreamRes.headers.get("Content-Type") || "video/MP2T",
    "Content-Length": upstreamRes.headers.get("Content-Length") || "",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable", // 24h Edge Cache
    "X-Worker-Cache": "MISS",
  });

  if (upstreamRes.headers.get("Content-Range")) {
    responseHeaders["Content-Range"] = upstreamRes.headers.get("Content-Range");
  }

  // Clean empty headers
  for (const k of Object.keys(responseHeaders)) {
    if (!responseHeaders[k]) delete responseHeaders[k];
  }

  const finalResponse = new Response(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: responseHeaders,
  });

  // Asynchronously store segment in Cloudflare Edge Cache
  if (isSegment && upstreamRes.status === 200) {
    ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));
  }

  return finalResponse;
}

// ── 2. Image Proxy & WebP Caching ──────────────────────────────────────────
async function handleImage(request, env, ctx) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");
  const fallbackUrl = url.searchParams.get("fallback");

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "Missing 'url' parameter" }), {
      status: 400,
      headers: corsHeaders({ "Content-Type": "application/json" }),
    });
  }

  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: "GET" });
  const cachedResponse = await cache.match(cacheKey);

  if (cachedResponse) {
    const res = new Response(cachedResponse.body, cachedResponse);
    res.headers.set("X-Worker-Cache", "HIT");
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  }

  const fetchCandidate = async (candidateUrl) => {
    let parsed;
    try {
      parsed = new URL(candidateUrl);
    } catch {
      return null;
    }
    if (isPrivateIpOrHost(parsed.hostname)) return null;

    const headers = new Headers();
    headers.set(
      "User-Agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    );
    headers.set("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8");
    headers.set("Referer", `${parsed.protocol}//${parsed.hostname}/`);

    try {
      const res = await fetch(candidateUrl, { headers, redirect: "follow" });
      if (res.ok) return res;
    } catch {
      return null;
    }
    return null;
  };

  let imageRes = await fetchCandidate(targetUrl);
  if (!imageRes && fallbackUrl) {
    imageRes = await fetchCandidate(fallbackUrl);
  }

  if (!imageRes) {
    return new Response(JSON.stringify({ error: "Failed to fetch image upstream" }), {
      status: 502,
      headers: corsHeaders({ "Content-Type": "application/json" }),
    });
  }

  const contentType = imageRes.headers.get("Content-Type") || "image/jpeg";
  const responseHeaders = corsHeaders({
    "Content-Type": contentType,
    "Content-Length": imageRes.headers.get("Content-Length") || "",
    "Cache-Control": "public, max-age=2592000, s-maxage=2592000, immutable", // 30 days Edge Cache
    "X-Worker-Cache": "MISS",
  });

  const finalResponse = new Response(imageRes.body, {
    status: 200,
    headers: responseHeaders,
  });

  // Cache image at Edge
  ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));
  return finalResponse;
}

// ── 3. Subtitles Relay & SRT->WebVTT Converter ─────────────────────────────
function srtToWebVtt(srtContent) {
  let vtt = srtContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Replace comma timestamp delimiters with dots (00:00:20,000 -> 00:00:20.000)
  vtt = vtt.replace(
    /(\d{2}:\d{2}:\d{2}),(\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}),(\d{3})/g,
    "$1.$2 --> $3.$4",
  );
  // Ensure header exists
  if (!vtt.startsWith("WEBVTT")) {
    vtt = "WEBVTT\n\n" + vtt;
  }
  return vtt;
}

async function handleSubtitles(request, env, ctx) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url") || url.searchParams.get("url1");

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "Missing 'url' parameter" }), {
      status: 400,
      headers: corsHeaders({ "Content-Type": "application/json" }),
    });
  }

  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: "GET" });
  const cachedResponse = await cache.match(cacheKey);

  if (cachedResponse) {
    const res = new Response(cachedResponse.body, cachedResponse);
    res.headers.set("X-Worker-Cache", "HIT");
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  }

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid subtitle URL" }), {
      status: 400,
      headers: corsHeaders({ "Content-Type": "application/json" }),
    });
  }

  if (isPrivateIpOrHost(parsed.hostname)) {
    return new Response(JSON.stringify({ error: "Private IP access forbidden" }), {
      status: 403,
      headers: corsHeaders({ "Content-Type": "application/json" }),
    });
  }

  const upstreamRes = await fetch(targetUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Accept: "text/vtt,text/plain,*/*",
    },
    redirect: "follow",
  });

  if (!upstreamRes.ok) {
    return new Response(JSON.stringify({ error: "Upstream subtitle request failed" }), {
      status: upstreamRes.status,
      headers: corsHeaders({ "Content-Type": "application/json" }),
    });
  }

  const text = await upstreamRes.text();
  const vttText = text.includes("WEBVTT") ? text : srtToWebVtt(text);

  const finalResponse = new Response(vttText, {
    status: 200,
    headers: corsHeaders({
      "Content-Type": "text/vtt; charset=utf-8",
      "Cache-Control": "public, max-age=2592000, s-maxage=2592000, immutable", // 30 days
      "X-Worker-Cache": "MISS",
    }),
  });

  ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));
  return finalResponse;
}

// ── 4. Catalog JSON Proxy & Edge Cache (KKPhim / OPhim / NguonC) ────────────
// Giảm latency cho listing pages từ ~300-800ms → ~5ms khi Cloudflare edge có cache.
// TTL ngắn (60s) để data không bị cũ quá lâu.
const CATALOG_ALLOWED_UPSTREAMS = [
  { host: "phimapi.com", prefix: "/phimapi/" },
  { host: "ophim1.com", prefix: "/ophim/" },
  { host: "phim.nguonc.com", prefix: "/nguonc/" },
];

async function handleCatalog(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname; // e.g. /catalog/phimapi/danh-sach/phim-moi?page=1

  // Strip /catalog prefix to get provider prefix
  const withoutCatalog = path.replace(/^\/catalog/, "");

  let upstream = null;
  for (const { host, prefix } of CATALOG_ALLOWED_UPSTREAMS) {
    if (withoutCatalog.startsWith(prefix)) {
      const apiPath = withoutCatalog.slice(prefix.length);
      upstream = `https://${host}/${apiPath}${url.search}`;
      break;
    }
  }

  if (!upstream) {
    return new Response(JSON.stringify({ error: "Unknown catalog provider" }), {
      status: 400,
      headers: corsHeaders({ "Content-Type": "application/json" }),
    });
  }

  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: "GET" });
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    const res = new Response(cachedResponse.body, cachedResponse);
    res.headers.set("X-Worker-Cache", "HIT");
    res.headers.set("Access-Control-Allow-Origin", "*");
    return res;
  }

  let upstreamRes;
  try {
    upstreamRes = await fetch(upstream, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FlexPhimBot/1.0)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return new Response(JSON.stringify({ error: "Upstream timeout" }), {
      status: 504,
      headers: corsHeaders({ "Content-Type": "application/json" }),
    });
  }

  if (!upstreamRes.ok) {
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: corsHeaders({ "Content-Type": "application/json" }),
    });
  }

  // Listing pages: 60s cache (danh-sach, the-loai, quoc-gia, tim-kiem)
  // Detail pages: 300s cache (phim/{slug})
  const isDetail = /\/phim\/[^/?]+$/.test(withoutCatalog);
  const ttl = isDetail ? 300 : 60;

  const finalResponse = new Response(upstreamRes.body, {
    status: 200,
    headers: corsHeaders({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${ttl}, s-maxage=${ttl}`,
      "X-Worker-Cache": "MISS",
      "X-Upstream": upstream,
    }),
  });

  ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));
  return finalResponse;
}

// ── Main Worker Dispatcher ──────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    const url = new URL(request.url);
    const workerUrl = `${url.protocol}//${url.host}`;
    const path = url.pathname.toLowerCase();

    // Health check
    if (path === "/health" || path === "/ping") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          service: "FlexPhim Edge Media Gateway",
          edge_colo: request.cf?.colo || "local",
          edge_country: request.cf?.country || "VN",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: corsHeaders({ "Content-Type": "application/json" }),
        },
      );
    }

    // 1. HLS Stream Relay (/hls, /hls-proxy)
    if (path === "/hls" || path === "/hls-proxy" || url.searchParams.get("mode") === "hls") {
      return handleHls(request, env, ctx, workerUrl);
    }

    // 2. Image Proxy (/image, /image-proxy)
    if (path === "/image" || path === "/image-proxy" || url.searchParams.get("mode") === "image") {
      return handleImage(request, env, ctx);
    }

    // 3. Subtitles Relay (/subtitles, /api/subtitles)
    if (path === "/subtitles" || path === "/api/subtitles" || url.searchParams.get("mode") === "subtitles") {
      return handleSubtitles(request, env, ctx);
    }

    // 4. Catalog JSON Proxy + Edge Cache (/catalog/...)
    if (path.startsWith("/catalog/")) {
      return handleCatalog(request, env, ctx);
    }

    // Default: Documentation / Welcome Screen
    return new Response(
      JSON.stringify(
        {
          name: "FlexPhim Cloudflare Edge Media Gateway",
          version: "1.1.0",
          endpoints: {
            hls: `${workerUrl}/hls?url={encoded_m3u8_or_ts_url}`,
            image: `${workerUrl}/image?url={encoded_image_url}&fallback={optional_fallback}`,
            subtitles: `${workerUrl}/subtitles?url={encoded_srt_or_vtt_url}`,
            catalog: `${workerUrl}/catalog/{phimapi|ophim|nguonc}/{api_path}`,
            health: `${workerUrl}/health`,
          },
          docs: "Pass the target URL as query parameter 'url'. All responses are edge-cached and CORS-enabled.",
        },
        null,
        2,
      ),
      {
        status: 200,
        headers: corsHeaders({ "Content-Type": "application/json" }),
      },
    );
  },
};

