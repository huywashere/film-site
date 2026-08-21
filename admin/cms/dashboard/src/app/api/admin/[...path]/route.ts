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

  const target = new URL(`${adminApiBaseUrl()}/admin/${path.join("/")}`);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const body = ["GET", "HEAD"].includes(request.method)
      ? undefined
      : await request.arrayBuffer();
    const response = await fetch(target, {
      method: request.method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": request.headers.get("content-type") || "application/json",
        "x-admin-session-token": sessionToken,
        "x-forwarded-for": request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "",
        "user-agent": request.headers.get("user-agent") || "NetPhim-Control-Room",
      },
      body: body && body.byteLength ? body : undefined,
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") || "application/json";
    return new NextResponse(await response.arrayBuffer(), {
      status: response.status,
      headers: { "Content-Type": contentType, "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error && error.name === "AbortError"
            ? "API quản trị phản hồi quá thời gian"
            : "Không thể kết nối API quản trị",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;
