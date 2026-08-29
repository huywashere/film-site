import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROOTS = new Set(["movies", "catalog", "search", "top10"]);

function gatewayOrigin() {
  // Do not silently assume a local Go process exists. On local/Vercel builds
  // the gateway is optional; an absent setting must fail immediately so the
  // browser can use the existing TypeScript provider fallback without waiting
  // for a dead localhost connection on every catalogue section.
  const value = process.env.MEDIA_GATEWAY_INTERNAL_URL?.trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (!/^https?:$/.test(parsed.protocol)) return null;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  if (
    !path?.length ||
    path.length > 4 ||
    !ALLOWED_ROOTS.has(path[0]) ||
    path.some(
      (segment) =>
        !segment ||
        segment.length > 180 ||
        !/^[\p{L}\p{N}._~-]+$/u.test(segment),
    ) ||
    request.nextUrl.search.length > 2048
  ) {
    return NextResponse.json(
      { error: "Đường dẫn không hợp lệ" },
      { status: 400 },
    );
  }

  const origin = gatewayOrigin();
  if (!origin) {
    if (path.join("/") === "catalog/providers/health") {
      return NextResponse.json(
        { available: false },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
            "X-NetPhim-Catalog-Available": "0",
          },
        },
      );
    }
    return NextResponse.json(
      { error: "Catalog gateway chưa được cấu hình" },
      { status: 503 },
    );
  }

  const target = `${origin}/v1/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  try {
    const response = await fetch(target, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4_500),
      cache: "no-store",
    });
    const body = await response.arrayBuffer();
    const headers = new Headers();
    for (const name of [
      "content-type",
      "cache-control",
      "x-netphim-catalog-cache",
    ]) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    if (path.join("/") === "catalog/providers/health") {
      headers.set("X-NetPhim-Catalog-Available", response.ok ? "1" : "0");
    }
    headers.set("X-NetPhim-Catalog-Path", "gin-via-next");
    return new NextResponse(body, { status: response.status, headers });
  } catch {
    return NextResponse.json(
      { error: "Catalog gateway tạm thời không khả dụng" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
