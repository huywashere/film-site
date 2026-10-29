import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * OPhim API Proxy — Vô hiệu hóa (Đã loại bỏ khỏi hệ thống để tối ưu tải)
 */
export async function GET() {
  return NextResponse.json(
    { status: false, msg: "Nguồn phim OPhim đã bị loại bỏ khỏi hệ thống" },
    {
      status: 410,
      headers: {
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Source": "OPhim-Disabled",
      },
    },
  );
}
