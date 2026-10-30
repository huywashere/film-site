import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "crypto";
import { clearServerConfigCache } from "@/app/page";

function validToken(received: string, candidates: (string | undefined)[]) {
  const normReceived = received.replace(/^["']|["']$/g, "").trim();
  if (normReceived.length < 32) return false;
  const receivedBuf = Buffer.from(normReceived);

  for (const candidate of candidates) {
    if (!candidate) continue;
    const normCandidate = candidate.replace(/^["']|["']$/g, "").trim();
    if (
      normCandidate.length >= 32 &&
      normCandidate.length === normReceived.length &&
      timingSafeEqual(receivedBuf, Buffer.from(normCandidate))
    ) {
      return true;
    }
  }
  return false;
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-revalidate-token") || "";
  const allowedSecrets = [
    process.env.REVALIDATE_SECRET,
    process.env.HLS_PROXY_SECRET,
  ];

  if (!validToken(token, allowedSecrets)) {
    return NextResponse.json({ message: "Không có quyền revalidate" }, { status: 401 });
  }

  // Bust in-memory server cache for instant reflection on next render
  try {
    clearServerConfigCache();
  } catch {}

  const payload = await request.json().catch(() => ({}));
  const paths = Array.isArray(payload.paths)
    ? payload.paths
        .map(String)
        .filter((path: string) => path.startsWith("/") && !path.includes("..") && path.length <= 300)
        .slice(0, 20)
    : ["/"];

  paths.forEach((path: string) => {
    try {
      revalidatePath(path, "page");
      revalidatePath(path, "layout");
    } catch {}
  });

  return NextResponse.json({ revalidated: paths, at: new Date().toISOString() });
}
