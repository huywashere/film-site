import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { message: "Chức năng này chỉ khả dụng trong môi trường phát triển (Dev)" },
      { status: 403 },
    );
  }

  const response = NextResponse.json({
    success: true,
    message: "Đăng nhập nhanh Local Dev thành công",
  });

  response.cookies.set(ADMIN_SESSION_COOKIE, "dev-local-session-token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60,
  });

  return response;
}
