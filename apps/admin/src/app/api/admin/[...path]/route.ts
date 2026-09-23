import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminApiBaseUrl,
} from "../../../../lib/admin-session";

export const dynamic = "force-dynamic";

const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "DELETE"]);
const TIMEOUT_MS = 15_000;

async function forward(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || "";
  if (!sessionToken) {
    return NextResponse.json({ message: "Phiên Admin đã hết hạn" }, { status: 401 });
  }
  if (!ALLOWED_METHODS.has(request.method)) {
    return NextResponse.json({ message: "Phương thức không được hỗ trợ" }, { status: 405 });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ message: "Nguồn yêu cầu không hợp lệ" }, { status: 403 });
  }

  const { path } = await context.params;
  if (!path?.length || path.some((part) => !/^[a-zA-Z0-9._~-]+$/.test(part))) {
    return NextResponse.json({ message: "Đường dẫn admin không hợp lệ" }, { status: 400 });
  }

  const targetUrlStr = `${adminApiBaseUrl()}/admin/${path.join("/")}`;
  const target = new URL(targetUrlStr);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));
  const isMediaUpload =
    request.method === "POST" && path.join("/") === "media/uploads";
  const controller = new AbortController();
  const timer = isMediaUpload
    ? undefined
    : setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const body = ["GET", "HEAD"].includes(request.method)
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
      // Fallback: If 127.0.0.1 failed, try localhost or vice-versa
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

    const contentType = response.headers.get("content-type") || "application/json";
    return new NextResponse(await response.arrayBuffer(), {
      status: response.status,
      headers: { "Content-Type": contentType, "Cache-Control": "no-store" },
    });
  } catch (error) {
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

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;
