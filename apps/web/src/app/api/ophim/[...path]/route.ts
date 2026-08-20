import { NextResponse } from "next/server";

// ── OPhim API Proxy (Tạm thời ẩn do server upstream không hoạt động) ──
export async function GET() {
  return NextResponse.json({
    status: false,
    msg: "OPhim API is temporarily disabled",
    items: [],
    data: { items: [] },
  });
}
