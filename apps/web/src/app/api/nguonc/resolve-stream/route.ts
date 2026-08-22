import { NextRequest, NextResponse } from "next/server";

const streamCache = new Map<string, { m3u8: string; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const embedUrl = searchParams.get("embed") || searchParams.get("url");

  if (!embedUrl) {
    return NextResponse.json({ error: "Missing embed URL" }, { status: 400 });
  }

  // Check cache
  const cached = streamCache.get(embedUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      m3u8: cached.m3u8,
      source: "cache",
    });
  }

  try {
    const res = await fetch(embedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: embedUrl,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned status ${res.status}` },
        { status: 502 },
      );
    }

    const html = await res.text();
    const match = html.match(/data-obf=["']([^"']+)["']/);
    if (!match) {
      return NextResponse.json(
        { error: "Could not find stream data in embed page" },
        { status: 404 },
      );
    }

    const obf = JSON.parse(Buffer.from(match[1], "base64").toString());
    const urlObj = new URL(embedUrl);
    const m3u8Url = `${urlObj.origin}/${obf.sUb}`;

    streamCache.set(embedUrl, {
      m3u8: m3u8Url,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      m3u8: m3u8Url,
      source: "fresh",
    });
  } catch (error) {
    console.error("[NguonC Stream Resolver Error]:", error);
    return NextResponse.json(
      { error: "Failed to extract m3u8 stream" },
      { status: 500 },
    );
  }
}
