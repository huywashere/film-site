import axios, { type AxiosResponse } from "axios";
import type { User } from "@/store/authStore";
import {
  dedupeFilmsBySource,
  extractFilmItems,
  isUsableMovieDetail,
  tagMovieDetailSource,
  type MovieSource,
} from "@/lib/movie-normalizer";
import { rankSearchResults, expandQuery, normalize } from "@/lib/search-engine";
import type {
  PaginatedResponse,
  WatchHistoryItem,
  WatchlistItem,
} from "@/types/movie";
import { recordTelemetry } from "@/lib/telemetry";
import { normalizeNguonCPayload } from "@/lib/nguonc-normalizer";
import { normalizeVicdnPayload } from "@/lib/vicdn-normalizer";
import {
  curateCatalogFilms,
  type CuratedCatalogKind,
} from "@/lib/catalog-curation";

// ── Search In-Memory Cache & Deduping ─────────────────────────────
const SEARCH_CACHE_MAX_AGE_MS = 1000 * 60 * 10; // 10 phút
const globalSearchCache = new Map<string, { data: any; timestamp: number }>();
const globalPendingSearches = new Map<string, Promise<any>>();

// ── KKPhim API Configuration ──────────────────────────────────────
const KKPHIM_PROXY = "/api/kkphim";

const trackedMovieFetch = async (path: string) => {
  const startedAt = performance.now();
  try {
    const response = await fetch(path);
    recordTelemetry("movie_api.response", {
      path: path.split("?")[0],
      status: response.status,
      duration_ms: Math.round(performance.now() - startedAt),
      cache:
        response.headers.get("x-cache") ||
        response.headers.get("cache-status") ||
        "unknown",
    });
    return response;
  } catch (error) {
    recordTelemetry(
      "movie_api.error",
      {
        path: path.split("?")[0],
        duration_ms: Math.round(performance.now() - startedAt),
      },
      "warning",
    );
    throw error;
  }
};

// Helper function to handle API calls
const fetchKKPhim = async (endpoint: string) => {
  try {
    const response = await trackedMovieFetch(`${KKPHIM_PROXY}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("KKPhim API Error:", error);
    throw error;
  }
};

// ── KKPhim Direct API (qua Next.js proxy) ──────────────────────────
export const kkphimApi = {
  // Phim mới cập nhật
  getLatest: (page = 1) =>
    fetchKKPhim(`/danh-sach/phim-moi-cap-nhat?page=${page}`),

  // Danh sách theo loại (v1 API)
  getSeries: (page = 1, limit = 36) =>
    fetchKKPhim(`/v1/api/danh-sach/phim-bo?page=${page}&limit=${limit}`),

  getSingle: (page = 1, limit = 36) =>
    fetchKKPhim(`/v1/api/danh-sach/phim-le?page=${page}&limit=${limit}`),

  getAnime: (page = 1, limit = 36) =>
    fetchKKPhim(`/v1/api/danh-sach/hoat-hinh?page=${page}&limit=${limit}`),

  getTvShows: (page = 1, limit = 36) =>
    fetchKKPhim(`/v1/api/danh-sach/tv-shows?page=${page}&limit=${limit}`),

  // Lọc phim với nhiều tùy chọn
  getFiltered: (params: {
    type?: string; // phim-le, phim-bo, hoat-hinh, tv-shows
    status?: string; // trailer, ongoing, completed
    category?: string; // slug thể loại
    country?: string; // slug quốc gia
    year?: number;
    page?: number;
    limit?: number;
    sort_field?: string; // modified.time, year, _id
    sort_type?: string; // desc, asc
  }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });
    return fetchKKPhim(`/v1/api/danh-sach?${query.toString()}`);
  },

  // Chi tiết phim
  getDetail: (slug: string) => fetchKKPhim(`/phim/${slug}`),

  getDetailV1: (slug: string) => fetchKKPhim(`/v1/api/phim/${slug}`),

  // Thông tin phim theo ID
  getById: (id: string) => fetchKKPhim(`/phim/id/${id}`),

  getByTmdb: (tmdbId: string, type: "tv" | "movie", season?: number) => {
    const seasonParam = season ? `&season=${season}` : "";
    return fetchKKPhim(
      `/phim/tmdb?tmdb_id=${tmdbId}&type=${type}${seasonParam}`,
    );
  },

  getByImdb: (imdbId: string) => fetchKKPhim(`/phim/imdb?imdb_id=${imdbId}`),

  // Hình ảnh, diễn viên, từ khóa
  getImages: (tmdbType: "tv" | "movie", tmdbId: string) =>
    fetchKKPhim(`/phim/images?tmdb_type=${tmdbType}&tmdb_id=${tmdbId}`),

  getCast: (tmdbType: "tv" | "movie", tmdbId: string) =>
    fetchKKPhim(`/phim/cast?tmdb_type=${tmdbType}&tmdb_id=${tmdbId}`),

  getKeywords: (tmdbType: "tv" | "movie", tmdbId: string) =>
    fetchKKPhim(`/phim/keywords?tmdb_type=${tmdbType}&tmdb_id=${tmdbId}`),

  // Tìm kiếm siêu tốc thông minh với Multi-Alias, Bộ nhớ đệm Client & Truy vấn song song
  search: async (keyword: string, page = 1, limit = 36) => {
    const cleanKw = (keyword || "").trim();
    if (!cleanKw) return { data: { items: [] } };

    const cacheKey = `search:${cleanKw.toLowerCase()}:${page}:${limit}`;
    const now = Date.now();

    // 1. Kiểm tra Client In-Memory Cache (0ms response)
    const cached = globalSearchCache.get(cacheKey);
    if (cached && now - cached.timestamp < SEARCH_CACHE_MAX_AGE_MS) {
      return cached.data;
    }

    // 2. Tránh duplicate requests nếu query đang được fetch
    if (globalPendingSearches.has(cacheKey)) {
      return globalPendingSearches.get(cacheKey)!;
    }

    const executeSearch = async () => {
      // Dynamic import smart search to prevent circular deps
      const { getExpandedSearchTerms, searchLocalFilms } =
        await import("@/lib/smart-search");
      const candidateTerms = getExpandedSearchTerms(cleanKw);

      const allItems: any[] = [];
      const seenSlugs = new Set<string>();

      // ── OPTIMIZED: 1 KKPhim request thay vì 3 parallel requests ──────────
      // candidateTerms[0] là primary keyword (query gốc / normalized).
      // Aliases trong candidateTerms được dùng cho client-side re-ranking,
      // KHÔNG gửi thêm network request cho mỗi alias nữa.
      const primaryTerm = candidateTerms[0] || cleanKw;
      const kkData = await fetchKKPhim(
        `/v1/api/tim-kiem?keyword=${encodeURIComponent(primaryTerm)}&page=${page}&limit=${limit}`,
      ).catch(() => null);

      if (kkData) {
        const items = kkData?.data?.items || kkData?.items || [];
        for (const item of items) {
          if (item?.slug && !seenSlugs.has(item.slug)) {
            seenSlugs.add(item.slug);
            allItems.push(item);
          }
        }
      }

      // Nếu kết quả ít (<5), thử thêm 1 secondary term (VN↔EN alternate)
      // Tối đa 1 extra request — không phải 3 như trước
      if (allItems.length < 5 && candidateTerms.length > 1) {
        const secondTerm = candidateTerms.find(
          (t) => t !== primaryTerm && t.length > 2,
        );
        if (secondTerm) {
          const kkData2 = await fetchKKPhim(
            `/v1/api/tim-kiem?keyword=${encodeURIComponent(secondTerm)}&page=${page}&limit=${limit}`,
          ).catch(() => null);
          if (kkData2) {
            const items2 = kkData2?.data?.items || kkData2?.items || [];
            for (const item of items2) {
              if (item?.slug && !seenSlugs.has(item.slug)) {
                seenSlugs.add(item.slug);
                allItems.push(item);
              }
            }
          }
        }
      }

      // Nếu KKPhim trả về kết quả, lưu cache và trả về ngay
      if (allItems.length > 0) {
        const result = {
          data: {
            items: allItems,
            params: { pagination: { totalPages: 1 } },
          },
        };
        globalSearchCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });
        return result;
      }

      // 2. Fallback nhanh qua OPhim với các từ khóa ứng viên (nếu bật)
      if (ENABLE_OPHIM) {
        try {
          const ophimPromises = candidateTerms
            .slice(0, 2)
            .map((term) =>
              fetchOphim(`/tim-kiem?keyword=${encodeURIComponent(term)}`).catch(
                () => null,
              ),
            );
          const ophimResults = await Promise.allSettled(ophimPromises);
          for (const res of ophimResults) {
            if (res.status === "fulfilled" && res.value) {
              const items = res.value?.data?.items || res.value?.items || [];
              for (const item of items) {
                if (item?.slug && !seenSlugs.has(item.slug)) {
                  seenSlugs.add(item.slug);
                  allItems.push(item);
                }
              }
            }
          }
          if (allItems.length > 0) {
            const result = {
              data: {
                items: allItems,
                params: { pagination: { totalPages: 1 } },
              },
            };
            globalSearchCache.set(cacheKey, {
              data: result,
              timestamp: Date.now(),
            });
            return result;
          }
        } catch (_err) {
          // Fallback
        }
      }

      // 3. Fallback thông minh cuối cùng: Quét kho 100 phim bom tấn tuyển chọn
      const localMatches = searchLocalFilms(cleanKw);
      if (localMatches.length > 0) {
        const result = {
          data: {
            items: localMatches,
            params: { pagination: { totalPages: 1 } },
          },
        };
        globalSearchCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });
        return result;
      }

      // 4. Trả về kết quả rỗng có cấu trúc nếu không tìm thấy
      const emptyResult = {
        data: { items: [], params: { pagination: { totalPages: 1 } } },
      };
      globalSearchCache.set(cacheKey, {
        data: emptyResult,
        timestamp: Date.now(),
      });
      return emptyResult;
    };

    const searchPromise = executeSearch().finally(() => {
      globalPendingSearches.delete(cacheKey);
    });

    globalPendingSearches.set(cacheKey, searchPromise);
    return searchPromise;
  },

  // Thể loại
  getGenres: () => fetchKKPhim(`/the-loai`),

  getByGenre: (slug: string, page = 1, limit = 36) =>
    fetchKKPhim(`/v1/api/the-loai/${slug}?page=${page}&limit=${limit}`),

  // Quốc gia
  getCountries: () => fetchKKPhim(`/quoc-gia`),

  getByCountry: (slug: string, page = 1, limit = 36) =>
    fetchKKPhim(`/v1/api/quoc-gia/${slug}?page=${page}&limit=${limit}`),

  // Năm phát hành
  getYears: () => fetchKKPhim(`/nam-phat-hanh`),

  getByYear: (year: number, page = 1, limit = 36) =>
    fetchKKPhim(`/nam-phat-hanh/${year}?page=${page}&limit=${limit}`),
};

// ── Feature Flag: Tạm thời ẩn API OPhim do server ngưng hoạt động ──────
export const ENABLE_OPHIM = false;

// ── OPhim, NguonC & VSMOV Proxies ──────────────────────────────
const fetchOphim = async (endpoint: string) => {
  if (!ENABLE_OPHIM) {
    return {
      status: false,
      msg: "OPhim API is disabled",
      items: [],
      data: { items: [] },
    };
  }
  const response = await trackedMovieFetch(`/api/ophim${endpoint}`);
  const json = await response.json();
  return json;
};

const fetchNguonc = async (endpoint: string) => {
  let proxyStatus = 0;
  try {
    const response = await trackedMovieFetch(`/api/nguonc${endpoint}`);
    proxyStatus = response.status;
    if (response.ok) {
      const payload = await response.json();
      if (payload?.status !== false && payload?.error !== true) return payload;
    }
  } catch {
    // Some serverless egress ranges are rejected by NguonC's Cloudflare edge.
  }

  if (typeof window === "undefined") {
    throw new Error(`NguonC API Error: ${proxyStatus || "proxy unavailable"}`);
  }

  // NguonC's public API allows browser CORS. Use it only when our same-origin
  // proxy has failed so local/VPS cache behavior remains the primary path.
  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;
  const directUrl = new URL(
    normalizedEndpoint.replace(/^\/+/, ""),
    "https://phim.nguonc.com/api/",
  );
  const directResponse = await fetch(directUrl, {
    headers: { Accept: "application/json" },
    credentials: "omit",
    mode: "cors",
    signal: AbortSignal.timeout(8000),
  });
  if (!directResponse.ok) {
    throw new Error(`NguonC direct API Error: ${directResponse.status}`);
  }
  return normalizeNguonCPayload(await directResponse.json());
};

const fetchVsmov = async (endpoint: string) => {
  const response = await trackedMovieFetch(`/api/vsmov${endpoint}`);
  if (!response.ok) throw new Error(`VSMOV API Error: ${response.status}`);
  return response.json();
};

const fetchVidsrc = async (endpoint: string) => {
  const response = await trackedMovieFetch(`/api/vidsrc${endpoint}`);
  if (!response.ok) throw new Error(`VidSrc API Error: ${response.status}`);
  return response.json();
};

export const vsmovApi = {
  // Phim mới cập nhật
  getLatest: (page = 1) =>
    fetchVsmov(`/danh-sach/phim-moi-cap-nhat?page=${page}`),

  // Danh sách theo loại
  getByType: (slug: string, page = 1) =>
    fetchVsmov(`/danh-sach/${slug}?page=${page}`),

  getSeries: (page = 1) => fetchVsmov(`/danh-sach/phim-bo?page=${page}`),
  getSingle: (page = 1) => fetchVsmov(`/danh-sach/phim-le?page=${page}`),
  getAnime: (page = 1) => fetchVsmov(`/danh-sach/hoat-hinh?page=${page}`),
  getNowShowing: (page = 1) => fetchVsmov(`/danh-sach/dang-chieu?page=${page}`),
  getDubbed: (page = 1) => fetchVsmov(`/danh-sach/long-tieng?page=${page}`),
  getSubteam: (page = 1) => fetchVsmov(`/danh-sach/subteam?page=${page}`),

  // Chi tiết phìm
  getDetail: (slug: string) => fetchVsmov(`/phim/${slug}`),

  // Theo thể loại, quốc gia, năm
  getByGenre: (slug: string, page = 1) =>
    fetchVsmov(`/the-loai/${slug}?page=${page}`),
  getByCountry: (slug: string, page = 1) =>
    fetchVsmov(`/quoc-gia/${slug}?page=${page}`),
  getByYear: (year: number, page = 1) =>
    fetchVsmov(`/nam-phat-hanh/${year}?page=${page}`),

  // Tìm kiếm
  search: (keyword: string, page = 1) =>
    fetchVsmov(`/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`),
};

const fetchVicdn = async (endpoint: string) => {
  let proxyStatus = 0;
  try {
    const response = await trackedMovieFetch(`/api/vicdn${endpoint}`);
    proxyStatus = response.status;
    if (response.ok) {
      const payload = await response.json();
      if (payload?.status !== false && payload?.error !== true) return payload;
    }
  } catch {
    // Ignore proxy fallback error
  }

  if (typeof window === "undefined") {
    throw new Error(`ViCDN API Error: ${proxyStatus || "proxy unavailable"}`);
  }

  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;
  const directUrl = new URL(
    normalizedEndpoint.replace(/^\/+/, ""),
    "https://vicdn.cc/api/",
  );
  const directResponse = await fetch(directUrl, {
    headers: { Accept: "application/json" },
    credentials: "omit",
    mode: "cors",
    signal: AbortSignal.timeout(8000),
  });
  if (!directResponse.ok) {
    throw new Error(`ViCDN direct API Error: ${directResponse.status}`);
  }
  return normalizeVicdnPayload(await directResponse.json());
};

// ── ViCDN API & Embed adapter (Song Ngữ / Bilingual) ──────────────
export const vicdnApi = {
  // Phim mới cập nhật
  getLatest: (page = 1) => fetchVicdn(`/update/${page}`),

  // Chi tiết phim & danh sách tập
  getDetail: (slug: string) => fetchVicdn(`/info/${slug}`),

  // Theo thể loại (hoat-hinh, vien-tuong, hinh-su, bi-an, hanh-dong, chinh-kich...)
  getByCategory: (key: string, page = 1) => fetchVicdn(`/type/${key}/${page}`),

  // Direct player embeds by TMDB ID
  getMovieEmbed: (tmdbId: string | number) =>
    `https://vicdn.cc/movie-${encodeURIComponent(String(tmdbId))}`,
  getTvEmbed: (tmdbId: string | number, season = 1, episode = 1) =>
    `https://vicdn.cc/tv-${encodeURIComponent(String(tmdbId))}-${season}-${episode}`,
};

// ── VidSrc embed adapter (TMDB IDs only; not a catalogue API) ─────
export const vidsrcApi = {
  getMovieEmbed: (tmdbId: string | number) =>
    fetchVidsrc(`/movie/${encodeURIComponent(String(tmdbId))}?sub=en`),
  getTvEmbed: (tmdbId: string | number, season: number, episode: number) =>
    fetchVidsrc(
      `/tv/${encodeURIComponent(String(tmdbId))}/${season}/${episode}?sub=en`,
    ),
};

// ── NguonC API (qua Next.js proxy) ────────────────────────────────
export const nguoncApi = {
  // Phim mới cập nhật
  getLatest: (page = 1) => fetchNguonc(`/films/phim-moi-cap-nhat?page=${page}`),

  // Danh sách theo loại
  getByCategory: (slug: string, page = 1) =>
    fetchNguonc(`/films/danh-sach/${slug}?page=${page}`),

  getSeries: (page = 1) => fetchNguonc(`/films/danh-sach/phim-bo?page=${page}`),
  getSingle: (page = 1) => fetchNguonc(`/films/danh-sach/phim-le?page=${page}`),
  getTvShows: (page = 1) =>
    fetchNguonc(`/films/danh-sach/tv-shows?page=${page}`),
  getNowShowing: (page = 1) =>
    fetchNguonc(`/films/danh-sach/dang-chieu?page=${page}`),

  // Chi tiết phìm
  getDetail: (slug: string) => fetchNguonc(`/film/${slug}`),

  // Theo thể loại, quốc gia, năm
  getByGenre: (slug: string, page = 1) =>
    fetchNguonc(`/films/the-loai/${slug}?page=${page}`),
  getByCountry: (slug: string, page = 1) =>
    fetchNguonc(`/films/quoc-gia/${slug}?page=${page}`),
  getByYear: (year: number, page = 1) =>
    fetchNguonc(`/films/nam-phat-hanh/${year}?page=${page}`),

  // Tìm kiếm
  search: (keyword: string, page = 1) =>
    fetchNguonc(
      `/films/search?keyword=${encodeURIComponent(keyword)}&page=${page}`,
    ),
};

function asRecord(value: unknown): Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function getTotalPages(data: unknown): number | undefined {
  const root = asRecord(data);
  const dataRecord = asRecord(root.data);
  const params = asRecord(dataRecord.params);
  const pagination = asRecord(params.pagination);
  const rootPagination = asRecord(root.pagination);
  const paginate = asRecord(root.paginate);

  return (
    readNumber(pagination.totalPages) ||
    readNumber(rootPagination.totalPages) ||
    readNumber(paginate.total_page)
  );
}

async function searchAllSources(
  keyword: string,
  page = 1,
  limit = 24,
  expandUpstream = true,
) {
  // Sanitize query: bỏ ký tự đặc biệt, gạch chéo vô tình gõ nhầm
  const trimmed = (keyword || "")
    .replace(/[\\/()[\]{}*+?^$|#@~`"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!trimmed) {
    return {
      status: "success",
      data: {
        items: [],
        params: {
          pagination: {
            currentPage: 1,
            totalItems: 0,
            totalItemsPerPage: limit,
            totalPages: 1,
          },
        },
      },
      _sources: [],
    };
  }

  const normQuery = normalize(trimmed);
  const isMetaQuery = [
    "thuyet minh",
    "thuyết minh",
    "thuyet-minh",
    "long tieng",
    "lồng tiếng",
    "long-tieng",
    "vietsub",
    "subteam",
    "chieu rap",
    "chiếu rạp",
  ].includes(normQuery);

  if (isMetaQuery) {
    try {
      const catalogData = await getFastCatalogPage(
        page,
        catalogRequests("latest", page),
      );
      const items = (
        catalogData?.data?.items ||
        catalogData?.items ||
        []
      ).slice(0, limit);
      return {
        status: "success",
        data: {
          items,
          params: {
            pagination: {
              currentPage: page,
              totalItems: items.length,
              totalItemsPerPage: limit,
              totalPages: 10,
            },
          },
        },
        _sources: [{ source: "kkphim", count: items.length }],
        _totalMerged: items.length,
        _query: { original: trimmed, variants: [trimmed] },
      };
    } catch {
      // Continue with normal search if catalog fallback fails
    }
  }

  // Expand query thành nhiều biến thể để tăng recall
  const variants = expandQuery(trimmed);
  const primaryKeyword = variants[0];
  const unaccentedKeyword = normalize(primaryKeyword);
  const encodedKeyword = encodeURIComponent(primaryKeyword);
  const encodedUnaccented = encodeURIComponent(unaccentedKeyword);

  // Gọi song song tất cả nguồn với primary keyword
  const requests: Array<{
    source: MovieSource;
    request: () => Promise<unknown>;
  }> = [
    {
      source: "kkphim",
      request: () => kkphimApi.search(primaryKeyword, page, limit),
    },
    ...(ENABLE_OPHIM
      ? [
          {
            // OPhim dùng /tim-kiem (không phải /v1/api/tim-kiem)
            source: "ophim" as MovieSource,
            request: () =>
              fetchOphim(`/tim-kiem?keyword=${encodedKeyword}&page=${page}`),
          },
        ]
      : []),
    {
      source: "nguonc",
      // NguonC API hoạt động tốt nhất với từ khoá không dấu
      request: () =>
        fetchNguonc(
          `/films/search?keyword=${encodedUnaccented}&page=${page}`,
        ).catch(() => null),
    },
    {
      source: "vsmov",
      request: () => vsmovApi.search(primaryKeyword, page).catch(() => null),
    },
  ];

  const primarySettled = await Promise.allSettled(
    requests.map((entry) => entry.request()),
  );

  // Gom kết quả từ primary requests
  const groups = primarySettled.map((result, i) => ({
    source: requests[i].source,
    items: result.status === "fulfilled" ? extractFilmItems(result.value) : [],
  }));

  // The normalized scorer already handles accents locally. Only ask upstreams
  // for a second spelling when the primary query returned too few candidates.
  // This removes two network requests from the common search path.
  const primaryMerged = dedupeFilmsBySource(groups);
  const shouldExpandUpstream =
    expandUpstream &&
    primaryMerged.length < Math.min(6, limit) &&
    variants.length > 1 &&
    variants[1] !== primaryKeyword;

  const extraRequests: Array<{
    source: MovieSource;
    request: () => Promise<unknown>;
  }> = shouldExpandUpstream
    ? [
        {
          source: "kkphim",
          request: () => kkphimApi.search(variants[1], page, limit),
        },
      ]
    : [];

  const extraSettled = await Promise.allSettled(
    extraRequests.map((entry) => entry.request()),
  );

  // Gom kết quả từ extra requests (variant query)
  const extraGroups = extraSettled.map((result, i) => ({
    source: extraRequests[i].source,
    items: result.status === "fulfilled" ? extractFilmItems(result.value) : [],
  }));

  // Merge tất cả groups (primary + extra)
  const allGroups = [...groups, ...extraGroups];
  let merged =
    extraGroups.length > 0 ? dedupeFilmsBySource(allGroups) : primaryMerged;

  // ── Fallback thông minh: nếu tất cả nguồn upstream đều không có, tìm trong kho curated ──
  if (merged.length === 0) {
    const { searchLocalFilms } = await import("@/lib/smart-search");
    const localMatches = searchLocalFilms(trimmed);
    if (localMatches.length > 0) {
      merged = dedupeFilmsBySource([{ source: "kkphim", items: localMatches }]);
    }
  }

  // ── Smart re-ranking với search engine (boost HD/Full, hạ Trailer/Cam) ──
  const ranked = rankSearchResults(merged, trimmed);

  // Paginate sau khi rank
  const startIndex = (page - 1) * limit;
  const items = ranked.slice(startIndex, startIndex + limit);

  const totalPages = Math.max(
    1,
    Math.ceil(ranked.length / limit),
    ...primarySettled.map((result) =>
      result.status === "fulfilled" ? getTotalPages(result.value) || 1 : 1,
    ),
  );

  return {
    status: "success",
    data: {
      items,
      params: {
        pagination: {
          currentPage: page,
          totalItems: ranked.length,
          totalItemsPerPage: limit,
          totalPages,
        },
      },
    },
    _sources: groups.map((g) => ({ source: g.source, count: g.items.length })),
    _totalMerged: merged.length,
    _query: { original: trimmed, variants },
  };
}

async function getDetailFromAnySource(
  slug: string,
  preferredSource?: MovieSource,
): Promise<any> {
  const requests: Array<{
    source: MovieSource;
    request: () => Promise<unknown>;
  }> = [
    {
      source: "kkphim",
      request: () => kkphimApi.getDetail(slug),
    },
    ...(ENABLE_OPHIM
      ? [
          {
            source: "ophim" as MovieSource,
            request: () => fetchOphim(`/phim/${slug}`),
          },
        ]
      : []),
    {
      source: "nguonc",
      request: () => fetchNguonc(`/film/${slug}`),
    },
    {
      source: "vsmov",
      request: () => vsmovApi.getDetail(slug),
    },
    {
      source: "vicdn",
      request: () => fetchVicdn(`/info/${slug}`),
    },
  ];

  const orderedRequests = preferredSource
    ? [
        ...requests.filter((entry) => entry.source === preferredSource),
        ...requests.filter((entry) => entry.source !== preferredSource),
      ]
    : requests;

  // Race every provider once. The old sequential loop could wait for four
  // individual timeouts and then repeated the same four requests in parallel,
  // leaving both detail and watch pages on skeletons for several seconds.
  try {
    return await Promise.any(
      orderedRequests.map(async (entry) => {
        const data = await entry.request();
        if (isUsableMovieDetail(data)) {
          return tagMovieDetailSource(data, entry.source);
        }
        throw new Error("Detail not usable");
      }),
    );
  } catch {
    return {
      status: false,
      error: true,
      message: `Không tìm thấy phim: ${slug}`,
    };
  }
}

async function getDetailFromSource(source: MovieSource, slug: string) {
  if (!slug) return null;
  const requests: Record<MovieSource, () => Promise<unknown>> = {
    kkphim: () => kkphimApi.getDetail(slug),
    ophim: () => fetchOphim(`/phim/${slug}`),
    nguonc: () => fetchNguonc(`/film/${slug}`),
    vsmov: () => vsmovApi.getDetail(slug),
    vicdn: () => fetchVicdn(`/info/${slug}`),
    vidsrc: () =>
      Promise.reject(new Error("VidSrc chỉ hỗ trợ trình phát bằng TMDB ID.")),
  };
  try {
    const data = await requests[source]();
    if (isUsableMovieDetail(data)) {
      return tagMovieDetailSource(data, source);
    }
    return null;
  } catch {
    return null;
  }
}

type CatalogSourceRequest = {
  source: MovieSource;
  request: () => Promise<unknown>;
};

/**
 * Read catalogue pages from every available provider. Lists used to be
 * hard-wired to KKPhim, which made the other healthy providers invisible.
 * Results are deduped by TMDB/IMDB/title-year and then interleaved so one
 * source cannot occupy the entire first viewport.
 */
async function getMergedCatalogPage(
  page: number,
  requests: CatalogSourceRequest[],
  perSourceLimit = 36,
): Promise<any> {
  const settled = await Promise.allSettled(
    requests.map((entry) => entry.request()),
  );
  const groups = requests.map((entry, index) => ({
    source: entry.source,
    items:
      settled[index].status === "fulfilled"
        ? extractFilmItems(settled[index].value)
        : [],
  }));
  const merged = dedupeFilmsBySource(groups);
  const sourceOrder: MovieSource[] = ["kkphim", "nguonc", "vsmov", "ophim"];
  const buckets = new Map<MovieSource, typeof merged>();

  for (const film of merged) {
    const bucket = buckets.get(film._source) || [];
    bucket.push(film);
    buckets.set(film._source, bucket);
  }

  const items: typeof merged = [];
  for (let cursor = 0; cursor < perSourceLimit; cursor += 1) {
    for (const source of sourceOrder) {
      const bucket = buckets.get(source);
      const next = bucket?.shift();
      if (next) items.push(next);
    }
  }

  return {
    status: true,
    msg: "done",
    items,
    params: {
      pagination: {
        currentPage: page,
        totalItems: items.length,
        totalItemsPerPage: items.length,
        totalPages: 1,
      },
    },
    pagination: {
      currentPage: page,
      totalItems: items.length,
      totalItemsPerPage: items.length,
      totalPages: 1,
    },
    paginate: {
      current_page: page,
      total_items: items.length,
      items_per_page: items.length,
      total_page: 1,
    },
    data: {
      items,
      params: {
        pagination: {
          currentPage: page,
          totalItems: items.length,
          totalItemsPerPage: items.length,
          totalPages: 1,
        },
      },
    },
    _sources: groups.map((group) => ({
      source: group.source,
      count: group.items.length,
    })),
  };
}

/**
 * Resolve the first healthy catalogue provider for interaction-critical pages.
 * The complete multi-source merge can continue in a separate background query;
 * navigation should not wait for the slowest upstream to time out.
 */
async function getFastCatalogPage(
  page: number,
  requests: CatalogSourceRequest[],
  curatedKind?: CuratedCatalogKind,
): Promise<any> {
  const resolveFirstHealthy = (tier: CatalogSourceRequest[]) =>
    Promise.any(
      tier.map(async ({ source, request }) => {
        const data = await request();
        const rawItems = extractFilmItems(data);
        if (!rawItems.length) throw new Error(`${source} returned no films`);
        const normalizedItems = dedupeFilmsBySource([
          { source, items: rawItems },
        ]);
        const items = curatedKind
          ? curateCatalogFilms(normalizedItems, curatedKind)
          : normalizedItems;
        if (!items.length) throw new Error(`${source} returned unusable films`);

        const sourceData = data as any;
        const sourcePagination =
          sourceData?.data?.params?.pagination ||
          sourceData?.params?.pagination ||
          sourceData?.pagination ||
          sourceData?.paginate ||
          sourceData?.data?.paginate ||
          {};

        const totalItems =
          Number(sourcePagination.totalItems) ||
          Number(sourcePagination.total_items) ||
          Number(sourcePagination.total) ||
          items.length;

        const totalItemsPerPage =
          Number(sourcePagination.totalItemsPerPage) ||
          Number(sourcePagination.items_per_page) ||
          Number(sourcePagination.limit) ||
          24;

        let totalPages =
          Number(sourcePagination.totalPages) ||
          Number(sourcePagination.total_page) ||
          Number(sourcePagination.total_pages) ||
          0;

        if (!totalPages && totalItems > 0 && totalItemsPerPage > 0) {
          totalPages = Math.ceil(totalItems / totalItemsPerPage);
        }
        if (!totalPages) totalPages = 1;

        const pagination = {
          currentPage:
            Number(sourcePagination.currentPage) ||
            Number(sourcePagination.current_page) ||
            page,
          totalItems,
          totalItemsPerPage,
          totalPages,
        };
        return {
          status: true,
          items,
          params: { pagination },
          pagination,
          data: { items, params: { pagination } },
          _sources: [{ source, count: items.length }],
          _fast: true,
        };
      }),
    );

  // KKPhim and healthy sources are fastest.
  const primary = requests.filter(
    ({ source }) => source === "kkphim" || (ENABLE_OPHIM && source === "ophim"),
  );
  const fallback = requests.filter(
    ({ source }) =>
      source !== "kkphim" && (!ENABLE_OPHIM || source !== "ophim"),
  );

  try {
    return await resolveFirstHealthy(primary.length ? primary : requests);
  } catch {
    return resolveFirstHealthy(fallback.length ? fallback : requests);
  }
}

function catalogRequests(
  kind:
    "latest" | "series" | "single" | "anime" | "tvshows" | "genre" | "country",
  page: number,
  value?: string,
): CatalogSourceRequest[] {
  const encodedValue = value ? encodeURIComponent(value) : "";
  const requests: CatalogSourceRequest[] = [
    {
      source: "kkphim",
      request: () => {
        if (kind === "latest") return kkphimApi.getLatest(page);
        if (kind === "series") return kkphimApi.getSeries(page, 64);
        if (kind === "single") return kkphimApi.getSingle(page, 64);
        if (kind === "anime") return kkphimApi.getAnime(page, 64);
        if (kind === "tvshows") return kkphimApi.getTvShows(page, 36);
        if (kind === "genre")
          return kkphimApi.getByGenre(value || "", page, 36);
        return kkphimApi.getByCountry(value || "", page, 36);
      },
    },
    {
      source: "nguonc",
      request: () => {
        if (kind === "latest") return nguoncApi.getLatest(page);
        if (kind === "series") return nguoncApi.getSeries(page);
        if (kind === "single") return nguoncApi.getSingle(page);
        if (kind === "tvshows") return nguoncApi.getTvShows(page);
        if (kind === "genre") {
          const nguonGenre =
            value === "vien-tuong" ? "khoa-hoc-vien-tuong" : value;
          return nguoncApi.getByGenre(nguonGenre || "", page);
        }
        if (kind === "country")
          return nguoncApi.getByCountry(value || "", page);
        return nguoncApi.getByCategory(
          kind === "anime" ? "hoat-hinh" : kind,
          page,
        );
      },
    },
    {
      source: "vsmov",
      request: () => {
        if (kind === "latest") return vsmovApi.getLatest(page);
        if (kind === "series") return vsmovApi.getSeries(page);
        if (kind === "single") return vsmovApi.getSingle(page);
        if (kind === "anime") return vsmovApi.getAnime(page);
        if (kind === "genre") return vsmovApi.getByGenre(value || "", page);
        if (kind === "country") return vsmovApi.getByCountry(value || "", page);
        return vsmovApi.getByType("tv-shows", page);
      },
    },
    {
      source: "vicdn",
      request: () => {
        if (kind === "latest") return vicdnApi.getLatest(page);
        if (kind === "anime") return vicdnApi.getByCategory("hoat-hinh", page);
        if (kind === "genre") {
          const map: Record<string, string> = {
            "hoat-hinh": "hoat-hinh",
            "vien-tuong": "vien-tuong",
            "khoa-hoc-vien-tuong": "vien-tuong",
            "hinh-su": "hinh-su",
            "bi-an": "bi-an",
            "hanh-dong": "hanh-dong",
            "chinh-kich": "chinh-kich",
          };
          const categoryKey = map[value || ""] || value || "hanh-dong";
          return vicdnApi.getByCategory(categoryKey, page);
        }
        return vicdnApi.getLatest(page);
      },
    },
    ...(ENABLE_OPHIM && kind !== "tvshows"
      ? [
          {
            source: "ophim" as MovieSource,
            request: () => {
              if (kind === "latest")
                return fetchOphim(`/danh-sach/phim-moi-cap-nhat?page=${page}`);
              if (kind === "series")
                return fetchOphim(
                  `/v1/api/danh-sach/phim-bo?page=${page}&limit=64`,
                );
              if (kind === "single")
                return fetchOphim(
                  `/v1/api/danh-sach/phim-le?page=${page}&limit=64`,
                );
              if (kind === "anime")
                return fetchOphim(
                  `/v1/api/danh-sach/hoat-hinh?page=${page}&limit=64`,
                );
              if (kind === "genre")
                return fetchOphim(
                  `/v1/api/the-loai/${encodedValue}?page=${page}&limit=36`,
                );
              return fetchOphim(
                `/v1/api/quoc-gia/${encodedValue}?page=${page}&limit=36`,
              );
            },
          } as CatalogSourceRequest,
        ]
      : []),
  ];
  return requests;
}

// ── movieApi (alias for component compatibility) ──────────────────
export const movieApi = {
  getLatest: (page = 1) =>
    getFastCatalogPage(page, catalogRequests("latest", page)).then((data) => ({
      data,
    })),
  getSeries: (page = 1) =>
    getFastCatalogPage(page, catalogRequests("series", page), "series").then(
      (data) => ({ data }),
    ),
  getSingle: (page = 1) =>
    getFastCatalogPage(page, catalogRequests("single", page), "single").then(
      (data) => ({ data }),
    ),
  getAnime: (page = 1) =>
    getFastCatalogPage(page, catalogRequests("anime", page), "anime").then(
      (data) => ({ data }),
    ),
  getTvShows: (page = 1) =>
    getFastCatalogPage(page, catalogRequests("tvshows", page)).then((data) => ({
      data,
    })),
  getDetail: (slug: string, preferredSource?: MovieSource) =>
    getDetailFromAnySource(slug, preferredSource).then((data) => ({ data })),
  getDetailFromSource: (source: MovieSource, slug: string) =>
    getDetailFromSource(source, slug).then((data) => ({ data })),
  getDetailV1: (slug: string) =>
    kkphimApi.getDetailV1(slug).then((data) => ({ data })),
  search: (keyword: string, page = 1, limit = 24) =>
    searchAllSources(keyword, page, limit).then((data) => ({ data })),
  searchSourceAlternatives: (keyword: string, page = 1, limit = 24) =>
    searchAllSources(keyword, page, limit, false).then((data) => ({ data })),
  getByGenre: (slug: string, page = 1) =>
    getFastCatalogPage(page, catalogRequests("genre", page, slug)).then(
      (data) => ({ data }),
    ),
  getByCountry: (slug: string, page = 1) =>
    getFastCatalogPage(page, catalogRequests("country", page, slug)).then(
      (data) => ({ data }),
    ),
  getByCountryFast: (slug: string, page = 1) =>
    getFastCatalogPage(page, catalogRequests("country", page, slug)).then(
      (data) => ({ data }),
    ),
  getByYear: (year: number, page = 1) =>
    kkphimApi.getByYear(year, page).then((data) => ({ data })),
  getGenres: () => kkphimApi.getGenres().then((data) => ({ data })),
  getCountries: () => kkphimApi.getCountries().then((data) => ({ data })),
  getYears: () => kkphimApi.getYears().then((data) => ({ data })),
  getFiltered: (params: Parameters<typeof kkphimApi.getFiltered>[0]) =>
    kkphimApi.getFiltered(params).then((data) => ({ data })),
  getFilmsByType: (type?: string, page = 1, _limit = 24) => {
    if (type === "phim-bo" || type === "series")
      return movieApi.getSeries(page);
    if (type === "phim-le" || type === "single")
      return movieApi.getSingle(page);
    if (type === "hoat-hinh" || type === "anime")
      return movieApi.getAnime(page);
    if (type === "tv-shows") return movieApi.getTvShows(page);
    return movieApi.getLatest(page);
  },
};

// ── NestJS Backend API (cần backend chạy) ───────────────────────────
const configuredApiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(
  /\/$/,
  "",
);
const defaultApiBase =
  process.env.NODE_ENV === "production"
    ? "https://victorious-possibility-production-aba7.up.railway.app/api/v1"
    : "http://localhost:3001/api/v1";

// The Nest application has a fixed `/api/v1` prefix. Older local env files
// used `/api`, which made every authenticated request return 404 after login.
const API_BASE = configuredApiBase
  ? configuredApiBase.endsWith("/api")
    ? `${configuredApiBase}/v1`
    : configuredApiBase
  : defaultApiBase;

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Request interceptor — attach auth token (removed local storage logic, handled by cookies)
api.interceptors.request.use((config) => {
  (config as typeof config & { metadata?: { startedAt: number } }).metadata = {
    startedAt: performance.now(),
  };
  return config;
});

// Response interceptor — handle 401 with refresh
api.interceptors.response.use(
  (res) => {
    const metadata = (
      res.config as typeof res.config & {
        metadata?: { startedAt: number };
      }
    ).metadata;
    recordTelemetry("api.response", {
      path: res.config.url || "unknown",
      status: res.status,
      duration_ms: metadata
        ? Math.round(performance.now() - metadata.startedAt)
        : 0,
      cache: res.headers["x-cache"] || res.headers["cache-status"] || "unknown",
    });
    return res;
  },
  async (err) => {
    const original = err.config;
    const metadata = (
      original as { metadata?: { startedAt: number } } | undefined
    )?.metadata;
    recordTelemetry(
      "api.error",
      {
        path: original?.url || "unknown",
        status: err.response?.status || 0,
        duration_ms: metadata
          ? Math.round(performance.now() - metadata.startedAt)
          : 0,
      },
      "warning",
    );
    const requestPath = String(original?.url || "");
    // Authentication endpoints deliberately return 401/400 while a user is
    // signing in, exchanging a Firebase token, or recovering a session.  A
    // global redirect here races the login UI and can send an already signed-in
    // user back to /login. Let the calling form surface that error instead.
    const isAuthFlowRequest =
      /^\/auth\/(?:me|login|register|firebase|refresh|2fa\/login-verify)/.test(
        requestPath,
      );

    if (
      err.response?.status === 401 &&
      !original._retry &&
      !isAuthFlowRequest
    ) {
      original._retry = true;
      try {
        // Because withCredentials is true, this post will automatically send the refreshToken cookie
        await axios.post(
          `${API_BASE}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        // Retry original request (cookies are automatically sent)
        return api(original);
      } catch {
        // A failed refresh must not navigate the whole application. Public
        // pages still issue a few optional account requests, and redirecting
        // from this shared interceptor made the home page bounce to /login.
        // Protected screens decide how to present an unauthenticated state.
      }
    }
    return Promise.reject(err);
  },
);

// ── Auth API ───────────────────────────────────────────────
let getMeInFlight: Promise<AxiosResponse<User>> | null = null;

function getCurrentUserOnce(): Promise<AxiosResponse<User>> {
  if (!getMeInFlight) {
    getMeInFlight = api.get<User>("/auth/me").finally(() => {
      getMeInFlight = null;
    });
  }
  return getMeInFlight;
}

export const authApi = {
  register: (data: {
    email: string;
    username: string;
    password: string;
    turnstileToken?: string;
  }) => api.post("/auth/register", data),
  login: (data: { email: string; password: string; turnstileToken?: string }) =>
    api.post("/auth/login", data),
  firebaseLogin: (idToken: string) =>
    api.post<{ success: true; user: import("@/store/authStore").User }>(
      "/auth/firebase",
      {},
      {
        headers: { Authorization: `Bearer ${idToken}` },
      },
    ),
  // Layout, auth pages and Firebase restoration can mount together. Coalesce
  // their bootstrap request so guests do not trigger several 401/refresh
  // round-trips and signed-in users only hydrate once.
  getMe: getCurrentUserOnce,
  verifyEmail: (data: { token: string }) =>
    api.post("/auth/verify-email", data),
  forgotPassword: (data: { email: string }) =>
    api.post("/auth/forgot-password", data),
  resetPassword: (data: { token: string; newPassword: string }) =>
    api.post("/auth/reset-password", data),

  // 2FA Endpoints
  setup2FA: () => api.post("/auth/2fa/setup"),
  verify2FA: (data: { code: string }) => api.post("/auth/2fa/verify", data),
  disable2FA: (data: { code: string }) => api.post("/auth/2fa/disable", data),
  loginVerify2FA: (data: { tempToken: string; code: string }) =>
    api.post("/auth/2fa/login-verify", data),

  // Profile & Password Endpoints
  updateProfile: (data: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    nameColor?: string;
    avatarFrameColor?: string;
    bio?: string;
  }) => api.put("/users/me", data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put("/auth/change-password", data),
  getSessions: () => api.get("/auth/sessions"),
  revokeSession: (id: string) => api.post(`/auth/sessions/${id}/revoke`),
  revokeAllSessions: () => api.post("/auth/sessions/revoke-all"),
  logout: () => api.post("/auth/logout"),
};

// ── Watchlist API ──────────────────────────────────────────
let cachedWatchlistPromise: Promise<any> | null = null;
let cachedWatchlistTime = 0;

export const watchlistApi = {
  get: (page = 1) =>
    api
      .get<PaginatedResponse<WatchlistItem>>(`/users/me/watchlist?page=${page}`)
      .catch(() => ({
        data: { items: [], total: 0, totalPages: 1, page: 1, limit: 20 } as any,
      })),
  add: (movieId: string, movieData?: any) => {
    cachedWatchlistPromise = null;
    return api.put("/users/me/watchlist", {
      movieId,
      title: movieData?.title,
      thumbUrl: movieData?.thumbUrl || movieData?.posterUrl,
    });
  },
  remove: (movieId: string) => {
    cachedWatchlistPromise = null;
    return api.put("/users/me/watchlist/remove", { movieId });
  },
  check: async (movieId: string) => {
    const now = Date.now();
    if (!cachedWatchlistPromise || now - cachedWatchlistTime > 5000) {
      cachedWatchlistTime = now;
      cachedWatchlistPromise = api
        .get(`/users/me/watchlist`)
        .catch(() => ({ data: [] }));
    }
    const r = await cachedWatchlistPromise;
    const list = Array.isArray(r.data) ? r.data : r.data?.items || [];
    const exists = list.some(
      (item: any) => item.movieId === movieId || item.movie?.id === movieId,
    );
    return { data: { inWatchlist: exists, isWatchlisted: exists } };
  },
};

// ── Reviews API ────────────────────────────────────────────
export const reviewsApi = {
  getByMovie: (movieId: string, page = 1) =>
    api
      .get(`/reviews/movie/${movieId}?page=${page}`)
      .catch(() => ({ data: [] })),
  getRecent: (page = 1) =>
    api.get(`/reviews?page=${page}`).catch(() => ({ data: [] })),
  getMine: (page = 1) =>
    api.get(`/reviews/mine?page=${page}`).catch(() => ({ data: [] })),
  create: (data: { movieId: string; content: string; rating?: number }) =>
    api.post("/reviews", data),
  delete: (id: string) => api.delete(`/reviews/${id}`),
  like: (id: string) => api.post(`/reviews/${id}/like`),
};

export const reportsApi = {
  create: (data: {
    category: string;
    filmTitle?: string;
    movieSlug?: string;
    episode?: string;
    serverName?: string;
    deviceInfo?: string;
    screenshotUrl?: string;
    description: string;
    email?: string;
  }) => api.post("/reports", data),
};

export type PublicSiteConfiguration = {
  maintenanceMode: boolean;
  maintenanceNotice?: string;
  announcementText?: string;
  announcementLink?: string;
  homePopupEnabled: boolean;
  homePopupTitle?: string;
  homePopupBody?: string;
  homePopupLink?: string;
  homePopupLinkLabel?: string;
  homePopupDismissLabel?: string;
  homePopupVersion: number;
  heroMovieSlugs: string[];
  providerPriority: string[];
  autoSkipIntro: boolean;
  watchPartyEnabled: boolean;
  homeTop10Slugs: string[];
  homeSectionOrder: string[];
  homeHiddenSections: string[];
  homeFeaturedRows?: Record<string, unknown>;
  seoTitle?: string;
  seoDescription?: string;
  cacheVersion: number;
  updatedAt?: string | null;
};

let publicSiteConfigurationRequest: Promise<
  AxiosResponse<PublicSiteConfiguration>
> | null = null;
let publicSiteConfigurationRequestedAt = 0;

export const siteConfigApi = {
  getPublic: () => {
    if (
      !publicSiteConfigurationRequest ||
      Date.now() - publicSiteConfigurationRequestedAt > 60_000
    ) {
      publicSiteConfigurationRequestedAt = Date.now();
      publicSiteConfigurationRequest = api
        .get<PublicSiteConfiguration>("/config/public")
        .catch((error) => {
          publicSiteConfigurationRequest = null;
          publicSiteConfigurationRequestedAt = 0;
          throw error;
        });
    }
    return publicSiteConfigurationRequest;
  },
};

export const viewApi = {
  record: (
    slug: string,
    data: {
      title: string;
      originName?: string;
      posterUrl?: string;
      year?: number;
      type?: string;
      episode?: string;
      serverName?: string;
      provider?: string;
    },
  ) => api.post(`/movies/${encodeURIComponent(slug)}/view`, data),
};

// ── Ratings API ────────────────────────────────────────────
export const ratingsApi = {
  rate: (movieId: string, score: number) =>
    api.post("/ratings", { movieId, score }),
  getAverage: (movieId: string) =>
    api
      .get(`/ratings/movie/${movieId}/average`)
      .catch(() => ({ data: { average: 0, count: 0 } })),
  getMine: (movieId: string) =>
    api
      .get(`/ratings/movie/${movieId}/mine`)
      .catch(() => ({ data: { score: 0 } })),
};

// ── Watch History API ──────────────────────────────────────
export const watchHistoryApi = {
  /** Upsert progress — call every 30s while watching */
  upsert: (data: {
    movieId: string;
    episode?: string;
    progress: number;
    duration: number;
    movieTitle: string;
    movieThumb?: string;
    serverName?: string;
  }) => api.put("/users/me/watch-history", data),

  /** Get paginated history list */
  getHistory: (page = 1, limit = 20) =>
    api
      .get<any>(`/users/me/watch-history?page=${page}&limit=${limit}`)
      .catch(() => ({ data: [] })),

  /** Get resume data for a specific movie (returns all episodes) */
  getResume: (movieId: string) =>
    api.get(`/users/me/watch-history`).catch(() => ({ data: [] })),

  /** Delete a single history entry */
  deleteEntry: (id: string) =>
    api
      .put("/users/me/watch-history/remove", { id })
      .catch(() => ({ data: null })),

  /** Clear all history */
  clearAll: () =>
    api.put("/users/me/watch-history/clear", {}).catch(() => ({ data: null })),
};
