/**
 * Cloudflare Worker Proxy for TMDB API & Images
 * Ultra-Fast, Unblocked, Global Edge CDN Proxy for TMDB
 * 
 * HƯỚNG DẪN DEPLOY TRONG 1 PHÚT (HOÀN TOÀN MIỄN PHÍ):
 * 1. Truy cập https://dash.cloudflare.com -> Chọn "Workers & Pages" -> "Create Application" -> "Create Worker".
 * 2. Đặt tên (ví dụ: `netphim-tmdb-proxy`) -> Bấm "Deploy".
 * 3. Bấm "Edit code" -> Dán toàn bộ mã nguồn bên dưới vào -> Bấm "Save and deploy".
 * 4. Copy đường dẫn Worker (ví dụ: `https://netphim-tmdb-proxy.subdomain.workers.dev`).
 * 5. Thêm dòng sau vào tệp `.env` hoặc Vercel Environment Variables của bạn:
 *    TMDB_CLOUDFLARE_WORKER_URL="https://netphim-tmdb-proxy.subdomain.workers.dev"
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Xử lý CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    // Phân loại Request: Ảnh (/t/p/...) hay Data API (/3/...)
    let upstreamUrl = "";
    if (url.pathname.startsWith("/t/p/")) {
      upstreamUrl = `https://image.tmdb.org${url.pathname}${url.search}`;
    } else if (url.pathname.startsWith("/3/")) {
      upstreamUrl = `https://api.themoviedb.org${url.pathname}${url.search}`;
    } else {
      upstreamUrl = `https://api.themoviedb.org/3${url.pathname}${url.search}`;
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(
      "User-Agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    );
    requestHeaders.delete("host");

    try {
      const response = await fetch(upstreamUrl, {
        method: request.method,
        headers: requestHeaders,
        body:
          request.method !== "GET" && request.method !== "HEAD"
            ? request.body
            : null,
      });

      const responseHeaders = new Headers(response.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      responseHeaders.set("Access-Control-Allow-Headers", "*");

      // Cấu hình Cache 7 ngày cho ảnh trên 300+ Edge Data Centers của Cloudflare
      if (url.pathname.startsWith("/t/p/")) {
        responseHeaders.set(
          "Cache-Control",
          "public, max-age=604800, s-maxage=604800, immutable",
        );
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Cloudflare TMDB Proxy Error", message: String(err) }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
