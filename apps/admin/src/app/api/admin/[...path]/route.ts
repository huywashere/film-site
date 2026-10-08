import fs from "fs";
import pathModule from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminApiBaseUrl,
} from "../../../../lib/admin-session";

export const dynamic = "force-dynamic";

const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "DELETE"]);
const TIMEOUT_MS = 15_000;

let cachedDevToken: string | null = null;
async function getDevAdminToken(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh && cachedDevToken) return cachedDevToken;
  try {
    const res = await fetch(`${adminApiBaseUrl()}/admin-auth/dev-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.token) {
        cachedDevToken = data.token;
        return cachedDevToken;
      }
    }
  } catch {}
  return null;
}

async function forward(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  let sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || "";
  let isDevAutoToken = false;

  if (!sessionToken && process.env.NODE_ENV !== "production") {
    const devToken = await getDevAdminToken();
    if (devToken) {
      sessionToken = devToken;
      isDevAutoToken = true;
    }
  }

  const { path } = await context.params;
  const isMediaUpload =
    request.method === "POST" && path?.join("/") === "media/uploads";

  if (!sessionToken && !isMediaUpload) {
    if (process.env.NODE_ENV !== "production") {
      const devRes = await handleDevFallback(request, path || []);
      if (devRes) return devRes;
    }
    return NextResponse.json({ message: "Phiên Admin đã hết hạn" }, { status: 401 });
  }

  if (!ALLOWED_METHODS.has(request.method)) {
    return NextResponse.json({ message: "Phương thức không được hỗ trợ" }, { status: 405 });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ message: "Nguồn yêu cầu không hợp lệ" }, { status: 403 });
  }

  if (!path?.length || path.some((part) => !/^[a-zA-Z0-9._~-]+$/.test(part))) {
    return NextResponse.json({ message: "Đường dẫn admin không hợp lệ" }, { status: 400 });
  }

  const targetUrlStr = `${adminApiBaseUrl()}/admin/${path.join("/")}`;
  const target = new URL(targetUrlStr);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));

  const controller = new AbortController();
  const timer = isMediaUpload
    ? undefined
    : setTimeout(() => controller.abort(), TIMEOUT_MS);
  let body: unknown = undefined;

  try {
    body = ["GET", "HEAD"].includes(request.method)
      ? undefined
      : isMediaUpload
        ? request.body
        : await request.arrayBuffer();

    let response: Response;
    try {
      response = await fetch(target, {
        method: request.method,
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": request.headers.get("content-type") || "application/json",
          ...(isMediaUpload && request.headers.get("content-length")
            ? { "Content-Length": request.headers.get("content-length")! }
            : {}),
          "x-admin-session-token": sessionToken,
          "x-forwarded-for": request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "",
          "user-agent": request.headers.get("user-agent") || "FlexPhim-Control-Room",
        },
        body: isMediaUpload
          ? (body as ReadableStream<Uint8Array> | null)
          : body && (body as ArrayBuffer).byteLength
            ? (body as ArrayBuffer)
            : undefined,
        signal: controller.signal,
        ...(isMediaUpload ? { duplex: "half" } : {}),
      } as RequestInit & { duplex?: "half" });
    } catch (primaryErr) {
      if (isMediaUpload) throw primaryErr;
      const fallbackHost = target.hostname === "127.0.0.1" ? "localhost" : "127.0.0.1";
      const fallbackUrl = new URL(target.toString());
      fallbackUrl.hostname = fallbackHost;
      response = await fetch(fallbackUrl, {
        method: request.method,
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": request.headers.get("content-type") || "application/json",
          "x-admin-session-token": sessionToken,
          "x-forwarded-for": request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "",
          "user-agent": request.headers.get("user-agent") || "FlexPhim-Control-Room",
        },
        body:
          body && (body as ArrayBuffer).byteLength
            ? (body as ArrayBuffer)
            : undefined,
        signal: controller.signal,
      });
    }

    // Auto-heal 401 in development mode
    if (response.status === 401 && process.env.NODE_ENV !== "production") {
      const freshToken = await getDevAdminToken(true);
      if (freshToken) {
        sessionToken = freshToken;
        isDevAutoToken = true;
        const retryRes = await fetch(target, {
          method: request.method,
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type": request.headers.get("content-type") || "application/json",
            "x-admin-session-token": freshToken,
            "user-agent": "FlexPhim-Control-Room",
          },
          body: body && (body as ArrayBuffer).byteLength ? (body as ArrayBuffer) : undefined,
          signal: controller.signal,
        }).catch(() => null);

        if (retryRes && retryRes.ok) {
          const retBuf = await retryRes.arrayBuffer();
          const retResponse = new NextResponse(retBuf, {
            status: retryRes.status,
            headers: {
              "Content-Type": retryRes.headers.get("content-type") || "application/json",
              "Cache-Control": "no-store",
            },
          });
          retResponse.cookies.set(ADMIN_SESSION_COOKIE, freshToken, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            path: "/",
            maxAge: 30 * 24 * 60 * 60,
          });
          return retResponse;
        }
      }

      // If retry fails, fall back to dev mock
      const devRes = await handleDevFallback(
        request,
        path,
        body as ArrayBuffer | undefined,
      );
      if (devRes) return devRes;
    }

    const contentType = response.headers.get("content-type") || "application/json";
    const finalRes = new NextResponse(await response.arrayBuffer(), {
      status: response.status,
      headers: { "Content-Type": contentType, "Cache-Control": "no-store" },
    });

    if (isDevAutoToken && sessionToken) {
      finalRes.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
    }

    return finalRes;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      const devRes = await handleDevFallback(
        request,
        path,
        body as ArrayBuffer | undefined,
      );
      if (devRes) return devRes;
    }
    console.error(`[Admin Proxy Error] ${request.method} ${targetUrlStr}:`, error);
    return NextResponse.json(
      {
        message:
          error instanceof Error && error.name === "AbortError"
            ? "API quản trị phản hồi quá thời gian"
            : error instanceof Error
              ? error.message
              : "Không thể kết nối API quản trị",
      },
      { status: 502 },
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function getDevConfigFile() {
  const dir = pathModule.resolve(process.cwd(), "../../.local-data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return pathModule.join(dir, "dev-site-config.json");
}

function readDevConfig() {
  const file = getDevConfigFile();
  const defaultConfig = {
    maintenanceMode: false,
    maintenanceNotice: "",
    announcementText: "",
    announcementLink: "",
    homePopupEnabled: false,
    homePopupTitle: "Thông báo từ FlexPhim",
    homePopupBody: "Chào mừng bạn đến với FlexPhim Control Room.",
    homePopupLink: "",
    homePopupLinkLabel: "",
    homePopupDismissLabel: "Đã hiểu",
    homePopupVersion: 1,
    heroMovieSlugs: [
      "oppenheimer",
      "dune-hanh-tinh-cat-2",
      "avatar-2-dong-chay-cua-nuoc",
      "ho-den-tu-than",
    ],
    providerPriority: ["kkphim", "ophim", "nguonc", "vsmov"],
    autoSkipIntro: true,
    watchPartyEnabled: true,
    homeTop10Slugs: [],
    homeSectionOrder: ["top10", "continue", "schedule", "latest", "vfx"],
    homeHiddenSections: [],
    homeFeaturedRows: {},
    seoTitle: "FlexPhim - Xem phim trực tuyến",
    seoDescription: "",
    cacheVersion: 1,
    updatedAt: new Date().toISOString(),
  };

  try {
    if (fs.existsSync(file)) {
      return { ...defaultConfig, ...JSON.parse(fs.readFileSync(file, "utf8")) };
    }
  } catch {}
  return defaultConfig;
}

function saveDevConfig(updated: any) {
  const file = getDevConfigFile();
  const current = readDevConfig();
  const merged = { ...current, ...updated, updatedAt: new Date().toISOString() };
  try {
    fs.writeFileSync(file, JSON.stringify(merged, null, 2), "utf8");
  } catch {}
  return merged;
}

async function handleDevFallback(request: NextRequest, path: string[], bodyBuffer?: ArrayBuffer) {
  const subPath = path.join("/");

  if (subPath === "me") {
    return NextResponse.json({
      id: "cmspo3az40005m7z90x3jjkjf",
      email: "huywashere@gmail.com",
      username: "huywashere_e9df7bbf",
      displayName: "Phu Huy Nguyen",
      role: "ADMIN",
      permissions: ["*"],
      twoFactorEnabled: false,
      internalDashboard: true,
    });
  }

  if (subPath.startsWith("stats")) {
    return NextResponse.json({
      totalUsers: 3,
      totalMovies: 578,
      activeUsers: 1,
      viewsToday: 0,
      viewsWeek: 0,
      viewsMonth: 2,
      range: "14d",
      rangeViews: 0,
      activeWatchParties: 0,
      openReports: 0,
      dailyChartData: [],
      topMovies: [],
      recentActivity: [],
    });
  }

  if (subPath.startsWith("notifications")) {
    return NextResponse.json({
      items: [],
      unread: 0,
    });
  }

  if (subPath === "configuration") {
    if (request.method === "GET") {
      return NextResponse.json(readDevConfig());
    }
    if (request.method === "PATCH") {
      try {
        const text = new TextDecoder().decode(bodyBuffer);
        const json = JSON.parse(text);
        const saved = saveDevConfig(json);
        return NextResponse.json(saved);
      } catch {
        return NextResponse.json(readDevConfig());
      }
    }
  }

  if (subPath.startsWith("configuration/revisions")) {
    return NextResponse.json([]);
  }

  if (subPath === "movies") {
    const search = request.nextUrl.searchParams.get("search");
    if (search) {
      try {
        const kkRes = await fetch(
          `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(search)}&limit=10`,
          { signal: AbortSignal.timeout(3500) },
        );
        if (kkRes.ok) {
          const json = await kkRes.json();
          const items = (json?.data?.items || []).map((m: any) => ({
            id: m.slug,
            title: m.name,
            originName: m.origin_name || m.slug,
            posterUrl: m.poster_url?.startsWith("http")
              ? m.poster_url
              : `https://phimimg.com/${m.poster_url}`,
            thumbUrl: m.thumb_url?.startsWith("http")
              ? m.thumb_url
              : `https://phimimg.com/${m.thumb_url}`,
            year: m.year,
            type: m.type || "single",
            quality: m.quality || "HD",
          }));
          return NextResponse.json({
            items,
            pagination: { page: 1, total: items.length, totalPages: 1 },
          });
        }
      } catch {}
    }
    return NextResponse.json({
      items: [],
      pagination: { page: 1, total: 0, totalPages: 0 },
    });
  }

  if (subPath === "sync-jobs" || subPath === "media/uploads") {
    return NextResponse.json([]);
  }

  return null;
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;
