import { NextRequest, NextResponse } from "next/server";
import {
  adminUnauthorizedResponse,
  isAdminRequestAuthorized,
} from "../../../lib/admin-auth";

export const dynamic = "force-dynamic";

type ProviderStatus = "operational" | "degraded" | "down";

type ProviderResult = {
  id: string;
  name: string;
  role: string;
  status: ProviderStatus;
  latencyMs: number;
  httpStatus: number | null;
  message: string;
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
  { expiresAt: number; payload: ReturnType<typeof buildPayload> } | undefined;
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
    // Fall back to the local web application below.
  }
  return "http://127.0.0.1:3000";
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
        "User-Agent": "CineVerse-Admin-Health/1.0",
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

    const degraded = latencyMs > DEGRADED_AFTER_MS;
    return {
      id: provider.id,
      name: provider.name,
      role: provider.role,
      status: degraded ? "degraded" : "operational",
      latencyMs,
      httpStatus: response.status,
      message: degraded ? "Hoạt động nhưng phản hồi chậm" : "Phản hồi hợp lệ",
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
  if (!isAdminRequestAuthorized(request)) return adminUnauthorizedResponse();
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
