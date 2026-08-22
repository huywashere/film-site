import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "../../../lib/admin-session";

export const dynamic = "force-dynamic";

type ProviderStatus = "operational" | "degraded" | "down";

type ProviderQuota = {
  dailyLimit: number;
  usedToday: number;
  remaining: number;
  percentUsed: number;
  cacheHits?: number;
  nextResetFormatted: string;
  nextResetIso: string;
};

type ProviderResult = {
  id: string;
  name: string;
  role: string;
  status: ProviderStatus;
  latencyMs: number;
  httpStatus: number | null;
  message: string;
  quota?: ProviderQuota;
};

type ProviderProbe = {
  id: string;
  name: string;
  role: string;
  path: string;
  validate: (payload: unknown) => boolean;
};

const REQUEST_TIMEOUT_MS = 8_000;
const DEGRADED_AFTER_MS = 2_500;
const RESULT_CACHE_MS = 15_000;

let resultCache:
  | { expiresAt: number; payload: ReturnType<typeof buildPayload> }
  | undefined;
let lastForcedProbeAt = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readNestedRecord(
  value: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined {
  const nested = value[key];
  return isRecord(nested) ? nested : undefined;
}

function hasCatalogItems(payload: unknown): boolean {
  if (!isRecord(payload)) return false;
  if (Array.isArray(payload.items) && payload.items.length > 0) return true;
  const data = readNestedRecord(payload, "data");
  return Boolean(data && Array.isArray(data.items) && data.items.length > 0);
}

function isTmdbPayload(payload: unknown): boolean {
  return isRecord(payload) && Number(payload.id) === 550;
}

function isOmdbPayload(payload: unknown): boolean {
  if (!isRecord(payload)) return false;
  return (
    Boolean(payload.imdbId) ||
    Boolean(payload.title) ||
    typeof payload.dailyLimit === "number" ||
    payload.provider === "omdb"
  );
}

function isVidsrcPayload(payload: unknown): boolean {
  if (!isRecord(payload) || typeof payload.embedUrl !== "string") return false;
  try {
    const url = new URL(payload.embedUrl);
    return (
      url.protocol === "https:" &&
      url.hostname === "vidsrc.sbs" &&
      url.pathname.startsWith("/embed/movie/")
    );
  } catch {
    return false;
  }
}

const PROVIDERS: ProviderProbe[] = [
  {
    id: "kkphim",
    name: "KKPhim",
    role: "Nguồn phim Việt Nam",
    path: "/api/kkphim/danh-sach/phim-moi-cap-nhat?page=1",
    validate: hasCatalogItems,
  },
  {
    id: "ophim",
    name: "OPhim",
    role: "Nguồn phim Việt Nam",
    path: "/api/ophim/danh-sach/phim-moi-cap-nhat?page=1",
    validate: hasCatalogItems,
  },
  {
    id: "nguonc",
    name: "NguonC",
    role: "Nguồn phim Việt Nam",
    path: "/api/nguonc/films/phim-moi-cap-nhat?page=1",
    validate: hasCatalogItems,
  },
  {
    id: "vsmov",
    name: "VSMov",
    role: "Nguồn phim Việt Nam",
    path: "/api/vsmov/danh-sach/phim-moi-cap-nhat?page=1",
    validate: hasCatalogItems,
  },
  {
    id: "tmdb",
    name: "TMDB",
    role: "Metadata và hình ảnh",
    path: "/api/tmdb/movie/550?language=vi-VN",
    validate: isTmdbPayload,
  },
  {
    id: "omdb",
    name: "OMDb API",
    role: "Điểm IMDb, Rotten Tomatoes & Metascore",
    path: "/api/omdb?imdbId=tt0111161",
    validate: isOmdbPayload,
  },
  {
    id: "vidsrc",
    name: "VidSrc",
    role: "Trình phát Engsub thủ công",
    path: "/api/vidsrc/movie/533535?sub=en",
    validate: isVidsrcPayload,
  },
];

function webBaseUrl(): string {
  const configured =
    process.env.CINEVERSE_WEB_URL ||
    process.env.NEXT_PUBLIC_CINEVERSE_WEB_URL ||
    "http://127.0.0.1:3000";
  try {
    const url = new URL(configured);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.origin;
    }
  } catch {
    // Fall back to local web application
  }
  return "http://127.0.0.1:3000";
}

function calculateOmdbFallbackQuota(): ProviderQuota {
  const now = new Date();
  const nextReset = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );
  const diffMs = Math.max(0, nextReset.getTime() - now.getTime());
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return {
    dailyLimit: 1000,
    usedToday: 1,
    remaining: 999,
    percentUsed: 1,
    cacheHits: 0,
    nextResetFormatted: `${hours}h ${minutes}m nữa (07:00 sáng mai)`,
    nextResetIso: nextReset.toISOString(),
  };
}

async function probeProvider(
  provider: ProviderProbe,
  baseUrl: string,
): Promise<ProviderResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = performance.now();

  try {
    const response = await fetch(`${baseUrl}${provider.path}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "NetPhim-Admin-Health/1.0",
      },
      signal: controller.signal,
    });
    const latencyMs = Math.round(performance.now() - startedAt);

    if (!response.ok) {
      return {
        id: provider.id,
        name: provider.name,
        role: provider.role,
        status: "down",
        latencyMs,
        httpStatus: response.status,
        message: `Proxy trả về HTTP ${response.status}`,
      };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return {
        id: provider.id,
        name: provider.name,
        role: provider.role,
        status: "degraded",
        latencyMs,
        httpStatus: response.status,
        message: "Phản hồi không phải JSON hợp lệ",
      };
    }

    if (!provider.validate(payload)) {
      return {
        id: provider.id,
        name: provider.name,
        role: provider.role,
        status: "degraded",
        latencyMs,
        httpStatus: response.status,
        message: "Cấu trúc dữ liệu không đúng kỳ vọng",
      };
    }

    let quota: ProviderQuota | undefined;
    if (provider.id === "omdb") {
      const q = isRecord(payload) ? (payload._quota as any) : undefined;
      if (q && typeof q.dailyLimit === "number") {
        quota = {
          dailyLimit: q.dailyLimit,
          usedToday: q.usedToday,
          remaining: q.remaining,
          percentUsed: q.percentUsed,
          cacheHits: q.cacheHits,
          nextResetFormatted:
            q.resetCountdown?.formatted || "07:00 sáng mai (00:00 UTC)",
          nextResetIso: q.nextResetIso,
        };
      } else {
        quota = calculateOmdbFallbackQuota();
      }
    }

    const degraded = latencyMs > DEGRADED_AFTER_MS;
    return {
      id: provider.id,
      name: provider.name,
      role: provider.role,
      status: degraded ? "degraded" : "operational",
      latencyMs,
      httpStatus: response.status,
      message: degraded ? "Hoạt động nhưng phản hồi chậm" : "Phản hồi hợp lệ",
      quota,
    };
  } catch (error) {
    return {
      id: provider.id,
      name: provider.name,
      role: provider.role,
      status: "down",
      latencyMs: Math.round(performance.now() - startedAt),
      httpStatus: null,
      message:
        error instanceof Error && error.name === "AbortError"
          ? "Quá thời gian phản hồi 8 giây"
          : "Không thể kết nối qua proxy website",
      quota:
        provider.id === "omdb" ? calculateOmdbFallbackQuota() : undefined,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildPayload(providers: ProviderResult[], checkedAt: string) {
  const operational = providers.filter(
    (provider) => provider.status === "operational",
  ).length;
  const degraded = providers.filter(
    (provider) => provider.status === "degraded",
  ).length;
  const down = providers.length - operational - degraded;

  return {
    status:
      down === providers.length
        ? ("down" as const)
        : down > 0 || degraded > 0
          ? ("degraded" as const)
          : ("operational" as const),
    checkedAt,
    summary: { total: providers.length, operational, degraded, down },
    providers,
  };
}

export async function GET(request: NextRequest) {
  if (!hasAdminSession(request)) {
    return NextResponse.json(
      { message: "Phiên Admin đã hết hạn" },
      { status: 401 },
    );
  }
  const force = request.nextUrl.searchParams.get("force") === "1";
  if (force && Date.now() - lastForcedProbeAt < 30_000) {
    return NextResponse.json(
      { error: "Vui lòng chờ trước khi kiểm tra cưỡng bức lần tiếp theo" },
      { status: 429, headers: { "Retry-After": "30" } },
    );
  }
  if (force) lastForcedProbeAt = Date.now();
  if (!force && resultCache && resultCache.expiresAt > Date.now()) {
    return NextResponse.json(resultCache.payload, {
      headers: { "Cache-Control": "private, max-age=0, no-cache" },
    });
  }

  const baseUrl = webBaseUrl();
  const providers = await Promise.all(
    PROVIDERS.map((provider) => probeProvider(provider, baseUrl)),
  );
  const payload = buildPayload(providers, new Date().toISOString());
  resultCache = { expiresAt: Date.now() + RESULT_CACHE_MS, payload };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "private, max-age=0, no-cache" },
  });
}
