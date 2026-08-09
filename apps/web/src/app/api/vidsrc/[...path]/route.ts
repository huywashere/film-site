import { NextRequest, NextResponse } from "next/server";
import { buildVidsrcEmbedUrl } from "@/lib/player-source-routing";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

function queryBoolean(value: string | null): boolean | undefined {
  if (value === "1") return true;
  if (value === "0") return false;
  return undefined;
}

/**
 * Local, validated adapter for the documented vidsrc.sbs embed API.
 *
 * GET /api/vidsrc/movie/{tmdbId}
 * GET /api/vidsrc/tv/{tmdbId}/{season}/{episode}
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  const [mediaType, tmdbId, season, episode] = path;

  if (mediaType !== "movie" && mediaType !== "tv") {
    return NextResponse.json(
      {
        error:
          "Đường dẫn VidSrc không hợp lệ. Dùng /movie/{tmdbId} hoặc /tv/{tmdbId}/{season}/{episode}.",
      },
      { status: 400 },
    );
  }

  const search = request.nextUrl.searchParams;
  const embedUrl = buildVidsrcEmbedUrl({
    tmdbId,
    mediaType,
    season,
    episode,
    autoplay: queryBoolean(search.get("autoplay")),
    subtitle: search.get("sub") || "en",
    color: search.get("color") || undefined,
    startAt: search.get("t"),
    controls: queryBoolean(search.get("controls")),
  });

  if (!embedUrl) {
    return NextResponse.json(
      { error: "TMDB ID, season hoặc episode không hợp lệ." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      status: true,
      source: "vidsrc",
      mediaType,
      tmdbId: Number(tmdbId),
      season: mediaType === "tv" ? Number(season) : undefined,
      episode: mediaType === "tv" ? Number(episode) : undefined,
      embedUrl,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
