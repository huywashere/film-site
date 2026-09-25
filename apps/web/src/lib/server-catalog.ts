import "server-only";

import { normalizeNguonCPayload } from "@/lib/nguonc-normalizer";
import { normalizeVicdnPayload } from "@/lib/vicdn-normalizer";

type CatalogSource = {
  url: string;
  transform?: (payload: any) => any;
  headers?: Record<string, string>;
};

const BROWSER_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
};

function firstOrigin(value: string | undefined, fallback: string): string {
  return (value?.split(/[\s,]+/).find(Boolean) || fallback).replace(/\/$/, "");
}

const ORIGINS = {
  kkphim: firstOrigin(
    process.env.KKPHIM_API_ORIGINS || process.env.KKPHIM_API_BASE,
    "https://phimapi.com",
  ),
  nguonc: firstOrigin(
    process.env.NGUONC_API_ORIGINS || process.env.NGUONC_API_BASE,
    "https://phim.nguonc.com/api",
  ),
  vsmov: firstOrigin(
    process.env.VSMOV_API_ORIGINS || process.env.VSMOV_API_BASE,
    "https://vsmov.com/api",
  ),
  ophim: firstOrigin(
    process.env.OPHIM_API_ORIGINS || process.env.OPHIM_API_BASE,
    "https://ophim1.com",
  ),
  vicdn: firstOrigin(
    process.env.VICDN_API_ORIGINS || process.env.VICDN_API_BASE,
    "https://vicdn.cc/api",
  ),
};

type CatalogKind =
  | "latest"
  | "series"
  | "single"
  | "shows"
  | "anime"
  | "vietsub"
  | "thuyet-minh"
  | "long-tieng"
  | "chieu-rap"
  | "dang-chieu"
  | "hoan-thanh"
  | "subteam";

const TYPE_ALIASES: Record<string, CatalogKind> = {
  latest: "latest",
  "phim-moi": "latest",
  series: "series",
  "phim-bo": "series",
  single: "single",
  "phim-le": "single",
  shows: "shows",
  tvshows: "shows",
  "tv-shows": "shows",
  anime: "anime",
  "hoat-hinh": "anime",
  vietsub: "vietsub",
  "phim-vietsub": "vietsub",
  "thuyet-minh": "thuyet-minh",
  thuyetminh: "thuyet-minh",
  "phim-thuyet-minh": "thuyet-minh",
  "thuyet-minh-ai": "thuyet-minh",
  thuyetminhai: "thuyet-minh",
  "song-ngu-ai": "thuyet-minh",
  "song-ngu": "thuyet-minh",
  songngu: "thuyet-minh",
  "phim-song-ngu": "thuyet-minh",
  "long-tieng": "long-tieng",
  longtieng: "long-tieng",
  "phim-long-tieng": "long-tieng",
  "chieu-rap": "chieu-rap",
  chieurap: "chieu-rap",
  "phim-chieu-rap": "chieu-rap",
  "dang-chieu": "dang-chieu",
  ongoing: "dang-chieu",
  "phim-bo-dang-chieu": "dang-chieu",
  "hoan-thanh": "hoan-thanh",
  completed: "hoan-thanh",
  "phim-bo-hoan-thanh": "hoan-thanh",
  subteam: "subteam",
  "nhom-dich": "subteam",
};

const PROVIDER_SLUGS: Record<CatalogKind, string> = {
  latest: "phim-moi-cap-nhat",
  series: "phim-bo",
  single: "phim-le",
  shows: "tv-shows",
  anime: "hoat-hinh",
  vietsub: "phim-vietsub",
  "thuyet-minh": "phim-thuyet-minh",
  "long-tieng": "phim-long-tieng",
  "chieu-rap": "phim-chieu-rap",
  "dang-chieu": "dang-chieu",
  "hoan-thanh": "hoan-thanh",
  subteam: "subteam",
};

function extractItems(payload: any): unknown[] {
  const items = payload?.data?.items || payload?.items;
  return Array.isArray(items) ? items : [];
}

function withQuery(path: string, page: number, limit = 64): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}page=${page}&limit=${limit}`;
}

function normalizeVsmovPayload(payload: any): any {
  const cdnBase =
    payload?.pathImage ||
    payload?.data?.pathImage ||
    "https://vsmov.com/storage/images/";
  const cdn = cdnBase.endsWith("/") ? cdnBase : `${cdnBase}/`;
  const normalizeItem = (item: any) => {
    const fix = (value: unknown) => {
      if (typeof value !== "string" || !value) return "";
      if (/^https?:\/\//.test(value)) return value;
      if (value.startsWith("//")) return `https:${value}`;
      return `${cdn}${value.replace(/^\//, "")}`;
    };
    return {
      ...item,
      thumb_url: fix(item?.thumb_url),
      poster_url: fix(item?.poster_url),
    };
  };

  if (Array.isArray(payload?.items)) {
    return { ...payload, items: payload.items.map(normalizeItem) };
  }
  if (Array.isArray(payload?.data?.items)) {
    return {
      ...payload,
      data: { ...payload.data, items: payload.data.items.map(normalizeItem) },
    };
  }
  return payload;
}

function directSource(path: string): CatalogSource {
  const mappings: Array<{
    prefix: string;
    origin: string;
    transform?: (payload: any) => any;
    headers?: Record<string, string>;
  }> = [
    { prefix: "/api/kkphim", origin: ORIGINS.kkphim },
    {
      prefix: "/api/nguonc",
      origin: ORIGINS.nguonc,
      transform: normalizeNguonCPayload,
      headers: {
        ...BROWSER_HEADERS,
        Referer: "https://phim.nguonc.com/",
        Origin: "https://phim.nguonc.com",
      },
    },
    {
      prefix: "/api/vsmov",
      origin: ORIGINS.vsmov,
      transform: normalizeVsmovPayload,
    },
    { prefix: "/api/ophim", origin: ORIGINS.ophim },
    {
      prefix: "/api/vicdn",
      origin: ORIGINS.vicdn,
      transform: normalizeVicdnPayload,
      headers: {
        ...BROWSER_HEADERS,
        Referer: "https://vicdn.cc/",
        Origin: "https://vicdn.cc",
      },
    },
  ];
  const mapping = mappings.find(({ prefix }) => path.startsWith(prefix));
  if (!mapping) return { url: path };
  return {
    url: `${mapping.origin}${path.slice(mapping.prefix.length)}`,
    transform: mapping.transform,
    headers: mapping.headers,
  };
}

function typePaths(kind: CatalogKind, page: number): string[] {
  if (kind === "latest") {
    return [
      withQuery("/api/kkphim/danh-sach/phim-moi-cap-nhat", page),
      withQuery("/api/nguonc/films/phim-moi-cap-nhat", page),
      withQuery("/api/vsmov/danh-sach/phim-moi-cap-nhat", page),
      withQuery("/api/ophim/danh-sach/phim-moi-cap-nhat", page),
    ];
  }

  const slug = PROVIDER_SLUGS[kind];
  return [
    withQuery(`/api/kkphim/v1/api/danh-sach/${slug}`, page, 36),
    withQuery(`/api/nguonc/films/danh-sach/${slug}`, page, 36),
    withQuery(`/api/vsmov/danh-sach/${slug}`, page, 36),
    withQuery(`/api/ophim/v1/api/danh-sach/${slug}`, page, 36),
  ];
}

function genrePaths(slug: string, page: number): string[] {
  const safeSlug = encodeURIComponent(slug);
  return [
    withQuery(`/api/kkphim/v1/api/the-loai/${safeSlug}`, page),
    withQuery(`/api/nguonc/films/the-loai/${safeSlug}`, page),
    withQuery(`/api/vsmov/the-loai/${safeSlug}`, page),
    withQuery(`/api/ophim/v1/api/the-loai/${safeSlug}`, page),
    `/api/vicdn/type/${safeSlug}/${page}`,
  ];
}

function countryPaths(slug: string, page: number): string[] {
  const safeSlug = encodeURIComponent(slug);
  return [
    withQuery(`/api/kkphim/v1/api/quoc-gia/${safeSlug}`, page),
    withQuery(`/api/nguonc/films/quoc-gia/${safeSlug}`, page),
    withQuery(`/api/vsmov/quoc-gia/${safeSlug}`, page),
    withQuery(`/api/ophim/v1/api/quoc-gia/${safeSlug}`, page),
  ];
}

type CatalogPreference = {
  minItems?: number;
  requireCategoryMetadata?: boolean;
};

function isPreferredCatalog(
  payload: any,
  preference: CatalogPreference,
): boolean {
  const items = extractItems(payload) as any[];
  if (items.length < (preference.minItems || 1)) return false;
  if (!preference.requireCategoryMetadata) return true;
  return items.some(
    (item) => Array.isArray(item?.category) && item.category.length > 0,
  );
}

/**
 * Start every provider concurrently, but give a rich catalogue a short grace
 * window to beat a tiny metadata-poor response. This keeps navigation fast
 * while preserving the category information required by curated topic rows.
 */
async function fetchFirstHealthyCatalog(
  paths: string[],
  preference: CatalogPreference = {},
): Promise<any | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);
  const attempts = paths.map(async (path) => {
    const source = directSource(path);
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: source.headers || BROWSER_HEADERS,
      next: { revalidate: 180 },
    });
    if (!response.ok) throw new Error(`Catalog source returned ${response.status}`);

    const rawPayload = await response.json();
    const payload = source.transform
      ? source.transform(rawPayload)
      : rawPayload;
    if (payload?.error || payload?.status === false || extractItems(payload).length === 0) {
      throw new Error("Catalog source returned no films");
    }
    return payload;
  });

  const firstHealthy = Promise.any(attempts);
  const preferred = Promise.any(
    attempts.map(async (attempt) => {
      const payload = await attempt;
      if (!isPreferredCatalog(payload, preference)) {
        throw new Error("Catalog source is too small for the initial view");
      }
      return payload;
    }),
  );
  const boundedFallback = new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => {
      void firstHealthy.then(resolve, reject);
    }, 1_400);
    void preferred.finally(() => clearTimeout(timer)).catch(() => undefined);
  });

  try {
    return await Promise.race([preferred, boundedFallback]);
  } catch {
    try {
      return await firstHealthy;
    } catch {
      return null;
    }
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

export async function getInitialFilmCatalog(
  type: string,
  page: number,
): Promise<any | null> {
  const kind = TYPE_ALIASES[type];
  if (!kind) return null;
  return fetchFirstHealthyCatalog(typePaths(kind, page), { minItems: 20 });
}

export async function getInitialGenreCatalog(
  slug: string,
  page: number,
): Promise<any | null> {
  return fetchFirstHealthyCatalog(genrePaths(slug, page), {
    minItems: 20,
    requireCategoryMetadata: true,
  });
}

export async function getInitialCountryCatalog(
  slug: string,
  page: number,
): Promise<any | null> {
  return fetchFirstHealthyCatalog(countryPaths(slug, page), {
    minItems: 20,
    requireCategoryMetadata: true,
  });
}

export async function getInitialBrowseCatalog(
  type: string | undefined,
  genre: string | undefined,
  country: string | undefined,
  page: number,
): Promise<any | null> {
  if (genre) return getInitialGenreCatalog(genre, page);
  if (country) return getInitialCountryCatalog(country, page);
  return getInitialFilmCatalog(!type || type === "all" ? "latest" : type, page);
}
