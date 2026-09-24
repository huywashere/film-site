import "server-only";

import { headers } from "next/headers";

const CATALOG_PATHS: Record<string, string> = {
  latest: "/danh-sach/phim-moi-cap-nhat",
  "phim-moi": "/danh-sach/phim-moi-cap-nhat",
  series: "/v1/api/danh-sach/phim-bo",
  "phim-bo": "/v1/api/danh-sach/phim-bo",
  single: "/v1/api/danh-sach/phim-le",
  "phim-le": "/v1/api/danh-sach/phim-le",
  shows: "/v1/api/danh-sach/tv-shows",
  tvshows: "/v1/api/danh-sach/tv-shows",
  "tv-shows": "/v1/api/danh-sach/tv-shows",
  anime: "/v1/api/danh-sach/hoat-hinh",
  "hoat-hinh": "/v1/api/danh-sach/hoat-hinh",
  vietsub: "/v1/api/danh-sach/phim-vietsub",
  "phim-vietsub": "/v1/api/danh-sach/phim-vietsub",
  "thuyet-minh": "/v1/api/danh-sach/phim-thuyet-minh",
  thuyetminh: "/v1/api/danh-sach/phim-thuyet-minh",
  "phim-thuyet-minh": "/v1/api/danh-sach/phim-thuyet-minh",
  "long-tieng": "/v1/api/danh-sach/phim-long-tieng",
  longtieng: "/v1/api/danh-sach/phim-long-tieng",
  "phim-long-tieng": "/v1/api/danh-sach/phim-long-tieng",
};

function extractItems(payload: any): unknown[] {
  const items = payload?.data?.items || payload?.items;
  return Array.isArray(items) ? items : [];
}

/**
 * Prime interaction-critical catalogue routes through the same first-party
 * proxy used by the browser. A bounded miss still lets React Query retry on
 * the client, but a healthy source reaches the first HTML instead of leaving
 * users on a route-level skeleton.
 */
export async function getInitialFilmCatalog(
  type: string,
  page: number,
): Promise<any | null> {
  const path = CATALOG_PATHS[type];
  if (!path) return null;

  try {
    const requestHeaders = await headers();
    const host =
      requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
    if (!host) return null;

    const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
    const protocol =
      forwardedProtocol || (host.startsWith("localhost") ? "http" : "https");
    const limit = path.includes("/v1/api/") ? "&limit=64" : "";
    const url = `${protocol}://${host}/api/kkphim${path}?page=${page}${limit}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(4_000),
      next: { revalidate: 180 },
    });

    if (!response.ok) return null;
    const payload = await response.json();
    return extractItems(payload).length > 0 ? payload : null;
  } catch {
    return null;
  }
}
