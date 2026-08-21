import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "crypto";

function validToken(received: string, expected: string) {
  return expected.length >= 32 && received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export async function POST(request: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET || "";
  if (!validToken(request.headers.get("x-revalidate-token") || "", expected)) {
    return NextResponse.json({ message: "Không có quyền revalidate" }, { status: 401 });
  }
  const payload = await request.json().catch(() => ({}));
  const paths = Array.isArray(payload.paths)
    ? payload.paths.map(String).filter((path: string) => path.startsWith("/") && !path.includes("..") && path.length <= 300).slice(0, 20)
    : ["/"];
  paths.forEach((path: string) => revalidatePath(path));
  return NextResponse.json({ revalidated: paths, at: new Date().toISOString() });
}
