import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const XINK_STREAM_SECRET_KEY = "onflix_secure_stream_v2_2026";

interface StreamMetadata {
  streamUrl: string;
  subtitles: { lang: string; url: string }[];
  thumbvtt?: string;
  cachedAt: number;
}

// In-memory cache for resolved stream URLs
const streamCache = new Map<string, StreamMetadata>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function decryptXinkStream(enc: string): string {
  const t = enc.slice(4);
  const key = XINK_STREAM_SECRET_KEY;
  let dec = "";
  for (let i = 0; i < t.length; i += 2) {
    dec += String.fromCharCode(
      parseInt(t.substr(i, 2), 16) ^ key.charCodeAt((i / 2) % key.length),
    );
  }
  return decodeURIComponent(dec);
}

async function resolveXinkStream(embedUrl: string): Promise<StreamMetadata | null> {
  const now = Date.now();
  const cached = streamCache.get(embedUrl);
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  try {
    const res = await fetch(embedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://xink.pro/",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) return null;
    const html = await res.text();

    const encMatch = html.match(/(enc_[a-f0-9]{30,})/);
    if (!encMatch) return null;

    const streamUrl = decryptXinkStream(encMatch[1]);

    // Extract subtitles if present
    const subtitles: { lang: string; url: string }[] = [];
    const subMatches = [
      ...html.matchAll(/\\?"subtitle_file\\?":\s*\\?"([^"\\]+)\\?"(?:[^\}]*?\\?"slug\\?":\s*\\?"([^"\\]+)\\?")?/g),
    ];
    for (const m of subMatches) {
      if (m[1] && m[1].startsWith("http")) {
        subtitles.push({
          url: m[1],
          lang: m[2] || "vi",
        });
      }
    }

    const entry: StreamMetadata = {
      streamUrl,
      subtitles,
      cachedAt: now,
    };

    streamCache.set(embedUrl, entry);
    return entry;
  } catch (err) {
    console.error("[xink-hls] Resolution error:", err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const embedUrl = searchParams.get("url") || searchParams.get("embed");
  const q = searchParams.get("q");
  const format = searchParams.get("format");

  if (!embedUrl) {
    return new NextResponse("Missing embed URL (?url=...)", { status: 400 });
  }

  const meta = await resolveXinkStream(embedUrl);
  if (!meta || !meta.streamUrl) {
    return new NextResponse("Failed to resolve stream from embed URL", { status: 502 });
  }

  // If client wants JSON metadata (e.g. subtitles, qualities)
  if (format === "json") {
    try {
      const infoRes = await fetch(meta.streamUrl);
      const infoData = await infoRes.json();
      return NextResponse.json({
        ...infoData,
        subtitles: meta.subtitles,
        hlsMasterUrl: `/api/xink/hls?url=${encodeURIComponent(embedUrl)}`,
      });
    } catch {
      return NextResponse.json({ error: "Failed to fetch stream info" }, { status: 502 });
    }
  }

  // Case 1: Specific quality level requested (e.g. ?url=...&q=0)
  if (q !== null && q !== undefined && q !== "") {
    try {
      const qRes = await fetch(`${meta.streamUrl}&q=${encodeURIComponent(q)}`);
      if (!qRes.ok) {
        return new NextResponse("Failed to fetch quality stream", { status: qRes.status });
      }
      const qData = await qRes.json();
      const m3u8Content = qData?.play_vid || "";
      if (!m3u8Content) {
        return new NextResponse("Empty playlist in quality response", { status: 502 });
      }

      return new NextResponse(m3u8Content, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Cache-Control": "public, max-age=300",
        },
      });
    } catch (err) {
      console.error("[xink-hls] Error fetching quality playlist:", err);
      return new NextResponse("Quality stream fetch failed", { status: 502 });
    }
  }

  // Case 2: Master playlist requested (?url=...)
  try {
    const masterRes = await fetch(meta.streamUrl);
    if (!masterRes.ok) {
      return new NextResponse("Failed to fetch stream master data", { status: masterRes.status });
    }
    const masterData = await masterRes.json();

    // If master manifest has quality levels
    if (Array.isArray(masterData?.qualities) && masterData.qualities.length > 0) {
      const lines = [
        "#EXTM3U",
        "#EXT-X-VERSION:3",
        "#EXT-X-INDEPENDENT-SEGMENTS",
      ];

      for (const qItem of masterData.qualities) {
        const bandwidth = qItem.bandwidth || 2500000;
        const resolution = qItem.resolution || "1920x1080";
        const name = qItem.quality || "HD";
        const qid = qItem.qid !== undefined ? qItem.qid : 0;

        lines.push(
          `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution},NAME="${name}"`,
        );
        lines.push(`/api/xink/hls?url=${encodeURIComponent(embedUrl)}&q=${qid}`);
      }

      return new NextResponse(lines.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    // If single play_vid playlist returned
    if (masterData?.play_vid) {
      return new NextResponse(masterData.play_vid, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    return new NextResponse("Invalid master manifest format", { status: 502 });
  } catch (err) {
    console.error("[xink-hls] Error generating master playlist:", err);
    return new NextResponse("Master stream resolution failed", { status: 502 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}
