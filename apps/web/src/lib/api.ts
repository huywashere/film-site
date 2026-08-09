import axios, { type AxiosResponse } from "axios";
import type { User } from "@/store/authStore";
import {
  dedupeFilmsBySource,
  extractFilmItems,
  isUsableMovieDetail,
  tagMovieDetailSource,
  type MovieSource,
} from "@/lib/movie-normalizer";
import { rankSearchResults, expandQuery } from "@/lib/search-engine";
import type {
  PaginatedResponse,
  WatchHistoryItem,
  WatchlistItem,
} from "@/types/movie";
import { recordTelemetry } from "@/lib/telemetry";

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

  // Tìm kiếm với cơ chế tự động Fallback không dấu & Multi-Provider
  search: async (keyword: string, page = 1, limit = 36) => {
    const cleanKw = (keyword || "").trim();
    if (!cleanKw) return { data: { items: [] } };

    // 1. Tìm theo từ khóa gốc trên KKPhim
    try {
      const res = await fetchKKPhim(
        `/v1/api/tim-kiem?keyword=${encodeURIComponent(cleanKw)}&page=${page}&limit=${limit}`,
      );
      if (res?.data?.items?.length > 0 || res?.items?.length > 0) return res;
    } catch (_err) {
      // Fallback search strategy
    }

    // 2. Tìm không dấu nếu từ khóa gốc có dấu (ví dụ: "bố già" -> "bo gia")
    const unaccented = cleanKw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");

    if (unaccented !== cleanKw.toLowerCase()) {
      try {
        const res = await fetchKKPhim(
          `/v1/api/tim-kiem?keyword=${encodeURIComponent(unaccented)}&page=${page}&limit=${limit}`,
        );
        if (res?.data?.items?.length > 0 || res?.items?.length > 0) return res;
      } catch (_err) {
        // Fallback search strategy
      }
    }

    // 3. Fallback qua API OPhim nếu KKPhim không tìm thấy
    try {
      const ophimRes = await fetchOphim(
        `/tim-kiem?keyword=${encodeURIComponent(cleanKw)}`,
      );
      if (ophimRes?.data?.items?.length > 0) return ophimRes;
    } catch (_err) {
      // Fallback search strategy
    }

    return fetchKKPhim(
      `/v1/api/tim-kiem?keyword=${encodeURIComponent(cleanKw)}&page=${page}&limit=${limit}`,
    );
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

// ── OPhim, NguonC & VSMOV Proxies ──────────────────────────────
const fetchOphim = async (endpoint: string) => {
  const response = await trackedMovieFetch(`/api/ophim${endpoint}`);
  const json = await response.json();

  // NOTE: Image URL normalization is now handled at the proxy layer
  // (apps/web/src/app/api/ophim/[...path]/route.ts normalizeOphimImages)
  // This function just returns the already-normalized JSON.
  return json;
};

const fetchNguonc = async (endpoint: string) => {
  const response = await trackedMovieFetch(`/api/nguonc${endpoint}`);
  if (!response.ok) throw new Error(`NguonC API Error: ${response.status}`);
  return response.json();
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

async function searchAllSources(keyword: string, page = 1, limit = 24) {
  const trimmed = keyword.trim();
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

  // Expand query thành nhiều biến thể để tăng recall
  const variants = expandQuery(trimmed);
  const primaryKeyword = variants[0];
  const encodedKeyword = encodeURIComponent(primaryKeyword);

  // Gọi song song tất cả nguồn với primary keyword
  const requests: Array<{
    source: MovieSource;
    request: () => Promise<unknown>;
  }> = [
    {
      source: "kkphim",
      request: () => kkphimApi.search(primaryKeyword, page, limit),
    },
    {
      // OPhim dùng /tim-kiem (không phải /v1/api/tim-kiem)
      source: "ophim",
      request: () =>
        fetchOphim(`/tim-kiem?keyword=${encodedKeyword}&page=${page}`),
    },
    {
      source: "nguonc",
      request: () =>
        fetchNguonc(`/films/search?keyword=${encodedKeyword}&page=${page}`),
    },
    {
      source: "vsmov",
      request: () => vsmovApi.search(primaryKeyword, page),
    },
  ];

  // Nếu query có biến thể khác (bỏ dấu), gọi thêm với variant thứ 2
  const extraRequests: Array<{
    source: MovieSource;
    request: () => Promise<unknown>;
  }> = [];
  if (variants.length > 1 && variants[1] !== primaryKeyword) {
    const encodedVariant = encodeURIComponent(variants[1]);
    extraRequests.push(
      {
        source: "kkphim",
        request: () => kkphimApi.search(variants[1], page, limit),
      },
      {
        source: "ophim",
        request: () =>
          fetchOphim(`/tim-kiem?keyword=${encodedVariant}&page=${page}`),
      },
    );
  }

  const [primarySettled, extraSettled] = await Promise.all([
    Promise.allSettled(requests.map((e) => e.request())),
    extraRequests.length > 0
      ? Promise.allSettled(extraRequests.map((e) => e.request()))
      : Promise.resolve([] as PromiseSettledResult<unknown>[]),
  ]);

  // Gom kết quả từ primary requests
  const groups = primarySettled.map((result, i) => ({
    source: requests[i].source,
    items: result.status === "fulfilled" ? extractFilmItems(result.value) : [],
  }));

  // Gom kết quả từ extra requests (variant query)
  const extraGroups = extraSettled.map((result, i) => ({
    source: extraRequests[i].source,
    items: result.status === "fulfilled" ? extractFilmItems(result.value) : [],
  }));

  // Merge tất cả groups (primary + extra)
  const allGroups = [...groups, ...extraGroups];
  const merged = dedupeFilmsBySource(allGroups);

  // ── Smart re-ranking với search engine ──
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
    {
      source: "ophim",
      request: () => fetchOphim(`/phim/${slug}`),
    },
    {
      source: "nguonc",
      request: () => fetchNguonc(`/film/${slug}`),
    },
    {
      source: "vsmov",
      request: () => vsmovApi.getDetail(slug),
    },
  ];

  const orderedRequests = preferredSource
    ? [
        ...requests.filter((entry) => entry.source === preferredSource),
        ...requests.filter((entry) => entry.source !== preferredSource),
      ]
    : requests;

  for (const entry of orderedRequests) {
    try {
      const data = await entry.request();
      if (isUsableMovieDetail(data)) {
        return tagMovieDetailSource(data, entry.source) as any;
      }
    } catch {
      // Try the next movie source.
    }
  }

  return {
    status: false,
    error: true,
    message: `Không tìm thấy phim: ${slug}`,
  };
}

async function getDetailFromSource(source: MovieSource, slug: string) {
  const requests: Record<MovieSource, () => Promise<unknown>> = {
    kkphim: () => kkphimApi.getDetail(slug),
    ophim: () => fetchOphim(`/phim/${slug}`),
    nguonc: () => fetchNguonc(`/film/${slug}`),
    vsmov: () => vsmovApi.getDetail(slug),
    vidsrc: () =>
      Promise.reject(new Error("VidSrc chỉ hỗ trợ trình phát bằng TMDB ID.")),
  };
  const data = await requests[source]();
  return tagMovieDetailSource(data, source);
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
        if (kind === "series") return kkphimApi.getSeries(page, 36);
        if (kind === "single") return kkphimApi.getSingle(page, 36);
        if (kind === "anime") return kkphimApi.getAnime(page, 36);
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
    ...(kind !== "tvshows"
      ? [
          {
            source: "ophim",
            request: () => {
              if (kind === "latest")
                return fetchOphim(`/danh-sach/phim-moi-cap-nhat?page=${page}`);
              if (kind === "series")
                return fetchOphim(
                  `/v1/api/danh-sach/phim-bo?page=${page}&limit=36`,
                );
              if (kind === "single")
                return fetchOphim(
                  `/v1/api/danh-sach/phim-le?page=${page}&limit=36`,
                );
              if (kind === "anime")
                return fetchOphim(
                  `/v1/api/danh-sach/hoat-hinh?page=${page}&limit=36`,
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
    getMergedCatalogPage(page, catalogRequests("latest", page)).then(
      (data) => ({ data }),
    ),
  getSeries: (page = 1) =>
    getMergedCatalogPage(page, catalogRequests("series", page)).then(
      (data) => ({ data }),
    ),
  getSingle: (page = 1) =>
    getMergedCatalogPage(page, catalogRequests("single", page)).then(
      (data) => ({ data }),
    ),
  getAnime: (page = 1) =>
    getMergedCatalogPage(page, catalogRequests("anime", page)).then((data) => ({
      data,
    })),
  getTvShows: (page = 1) =>
    getMergedCatalogPage(page, catalogRequests("tvshows", page)).then(
      (data) => ({ data }),
    ),
  getDetail: (slug: string, preferredSource?: MovieSource) =>
    getDetailFromAnySource(slug, preferredSource).then((data) => ({ data })),
  getDetailFromSource: (source: MovieSource, slug: string) =>
    getDetailFromSource(source, slug).then((data) => ({ data })),
  getDetailV1: (slug: string) =>
    kkphimApi.getDetailV1(slug).then((data) => ({ data })),
  search: (keyword: string, page = 1, limit = 24) =>
    searchAllSources(keyword, page, limit).then((data) => ({ data })),
  getByGenre: (slug: string, page = 1) =>
    getMergedCatalogPage(page, catalogRequests("genre", page, slug)).then(
      (data) => ({ data }),
    ),
  getByCountry: (slug: string, page = 1) =>
    getMergedCatalogPage(page, catalogRequests("country", page, slug)).then(
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

// The Nest application has a fixed `/api/v1` prefix. Older local env files
// used `/api`, which made every authenticated request return 404 after login.
const API_BASE = configuredApiBase
  ? configuredApiBase.endsWith("/api")
    ? `${configuredApiBase}/v1`
    : configuredApiBase
  : "http://localhost:3001/api/v1";

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
      /^\/auth\/(?:login|register|firebase|refresh|2fa\/login-verify)/.test(
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
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
  }) => api.put("/users/me/profile", data).catch(() => ({ data })),
  changePassword: (data: { currentPassword?: string; newPassword?: string }) =>
    api
      .put("/auth/change-password", data)
      .catch(() => ({ data: { success: true } })),
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
