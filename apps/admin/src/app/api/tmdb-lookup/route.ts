import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TMDB_API_KEY =
  process.env.TMDB_API_KEY || "f85dbd29011db19e75f5d29028fd096d";
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN?.trim() || "";

const GENRE_MAP_VI: Record<number, string> = {
  28: "Hành Động",
  12: "Phiêu Lưu",
  16: "Hoạt Hình",
  35: "Hài Hước",
  80: "Hình Sự",
  99: "Tài Liệu",
  18: "Chính Kịch",
  10751: "Gia Đình",
  14: "Thần Thoại & Viễn Tưởng",
  36: "Lịch Sử",
  27: "Kinh Dị",
  10402: "Âm Nhạc",
  9648: "Bí Ẩn",
  10749: "Lãng Mạn & Tình Cảm",
  878: "Khoa Học Viễn Tưởng",
  10770: "Phim Chiếu Mạng",
  53: "Giật Gân",
  10752: "Chiến Tranh",
  37: "Miền Tây",
  10759: "Hành Động & Phiêu Lưu",
  10762: "Trẻ Em",
  10763: "Tin Tức",
  10764: "Truyền Hình Thực Tế",
  10765: "Khoa Học & Viễn Tưởng",
  10766: "Tình Cảm Drama",
  10767: "Talk Show",
  10768: "Chiến Tranh & Chính Trị",
};

const COUNTRY_MAP_VI: Record<string, string> = {
  US: "Âu Mỹ",
  GB: "Âu Mỹ",
  KR: "Hàn Quốc",
  CN: "Trung Quốc",
  JP: "Nhật Bản",
  VN: "Việt Nam",
  TH: "Thái Lan",
  HK: "Hồng Kông",
  TW: "Đài Loan",
  FR: "Pháp",
  IN: "Ấn Độ",
  DE: "Đức",
  CA: "Canada",
  ES: "Tây Ban Nha",
  RU: "Nga",
  IT: "Ý",
  AU: "Úc",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function getAuthHeaders(): HeadersInit {
  if (TMDB_ACCESS_TOKEN && TMDB_ACCESS_TOKEN.startsWith("eyJ")) {
    return {
      Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
      Accept: "application/json",
    };
  }
  return { Accept: "application/json" };
}

function tmdbUrl(endpoint: string, params: Record<string, string> = {}): string {
  const url = new URL(`https://api.tmdb.org/3/${endpoint.replace(/^\//, "")}`);
  if (!TMDB_ACCESS_TOKEN || !TMDB_ACCESS_TOKEN.startsWith("eyJ")) {
    url.searchParams.set("api_key", TMDB_API_KEY);
  }
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const rawQuery = (searchParams.get("query") || searchParams.get("q") || "").trim();

  if (!rawQuery) {
    return NextResponse.json(
      { error: "Vui lòng nhập TMDB ID, link TMDB hoặc tên phim" },
      { status: 400 },
    );
  }

  try {
    let tmdbId: number | null = null;
    let mediaType: "movie" | "tv" | null = null;

    // Check if query is a TMDB URL
    // e.g. https://www.themoviedb.org/movie/1022789-inside-out-2
    // or https://www.themoviedb.org/tv/94605
    const urlMatch = rawQuery.match(/themoviedb\.org\/(movie|tv)\/(\d+)/i);
    if (urlMatch) {
      mediaType = urlMatch[1].toLowerCase() as "movie" | "tv";
      tmdbId = parseInt(urlMatch[2], 10);
    }

    // Check if query is short format: "movie/12345" or "tv/67890"
    if (!tmdbId) {
      const shortMatch = rawQuery.match(/^(movie|tv)\/(\d+)$/i);
      if (shortMatch) {
        mediaType = shortMatch[1].toLowerCase() as "movie" | "tv";
        tmdbId = parseInt(shortMatch[2], 10);
      }
    }

    // Check if query is purely numeric ID
    if (!tmdbId && /^\d+$/.test(rawQuery)) {
      tmdbId = parseInt(rawQuery, 10);
    }

    // If we only have numeric ID without mediaType, test movie first, then tv
    if (tmdbId && !mediaType) {
      const movieCheck = await fetch(
        tmdbUrl(`movie/${tmdbId}`),
        { headers: getAuthHeaders(), signal: AbortSignal.timeout(6000) },
      );
      if (movieCheck.ok) {
        mediaType = "movie";
      } else {
        const tvCheck = await fetch(
          tmdbUrl(`tv/${tmdbId}`),
          { headers: getAuthHeaders(), signal: AbortSignal.timeout(6000) },
        );
        if (tvCheck.ok) {
          mediaType = "tv";
        } else {
          return NextResponse.json(
            { error: `Không tìm thấy phim với TMDB ID: ${tmdbId}` },
            { status: 404 },
          );
        }
      }
    }

    // If query is text search
    if (!tmdbId) {
      const searchRes = await fetch(
        tmdbUrl("search/multi", {
          query: rawQuery,
          language: "vi-VN",
          include_adult: "false",
        }),
        { headers: getAuthHeaders(), signal: AbortSignal.timeout(8000) },
      );

      if (!searchRes.ok) {
        return NextResponse.json(
          { error: "Lỗi tìm kiếm TMDB. Vui lòng kiểm tra lại API key." },
          { status: searchRes.status },
        );
      }

      const searchData = await searchRes.json();
      const results = (searchData.results || []).filter(
        (item: any) => item.media_type === "movie" || item.media_type === "tv",
      );

      if (results.length === 0) {
        return NextResponse.json(
          { error: `Không tìm thấy kết quả nào trên TMDB cho: "${rawQuery}"` },
          { status: 404 },
        );
      }

      // If requested with &pick=first or if only 1 result, auto-pick first
      const pickFirst = searchParams.get("pick") === "first";
      if (!pickFirst && results.length > 1) {
        // Return candidates for user to choose
        return NextResponse.json({
          hasMultiple: true,
          query: rawQuery,
          candidates: results.slice(0, 8).map((item: any) => ({
            id: item.id,
            mediaType: item.media_type,
            title: item.title || item.name,
            originName: item.original_title || item.original_name,
            releaseDate: item.release_date || item.first_air_date || "",
            year: (item.release_date || item.first_air_date || "").slice(0, 4),
            posterUrl: item.poster_path
              ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
              : null,
            overview: item.overview || "",
            voteAverage: item.vote_average || 0,
          })),
        });
      }

      // Auto-pick first candidate
      tmdbId = results[0].id;
      mediaType = results[0].media_type as "movie" | "tv";
    }

    // Fetch full Vietnamese details
    const viRes = await fetch(
      tmdbUrl(`${mediaType}/${tmdbId}`, {
        language: "vi-VN",
        append_to_response: "videos,credits,external_ids",
      }),
      { headers: getAuthHeaders(), signal: AbortSignal.timeout(8000) },
    );

    if (!viRes.ok) {
      return NextResponse.json(
        { error: `Không thể tải chi tiết TMDB ID: ${tmdbId}` },
        { status: viRes.status },
      );
    }

    const viData = await viRes.json();

    // Fetch fallback English details if Vietnamese overview or title is missing
    let enData: any = null;
    if (!viData.overview || !viData.title || !viData.name || !viData.videos?.results?.length) {
      try {
        const enRes = await fetch(
          tmdbUrl(`${mediaType}/${tmdbId}`, {
            language: "en-US",
            append_to_response: "videos",
          }),
          { headers: getAuthHeaders(), signal: AbortSignal.timeout(6000) },
        );
        if (enRes.ok) {
          enData = await enRes.json();
        }
      } catch {
        // ignore English fallback error
      }
    }

    const title =
      viData.title || viData.name || enData?.title || enData?.name || rawQuery;
    const originName =
      viData.original_title || viData.original_name || enData?.original_title || "";
    const releaseDate =
      viData.release_date || viData.first_air_date || enData?.release_date || "";
    const year = releaseDate
      ? parseInt(releaseDate.slice(0, 4), 10)
      : new Date().getFullYear();

    const overview =
      viData.overview?.trim() || enData?.overview?.trim() || "";

    // Genres mapping
    const rawGenres: Array<{ id: number; name: string }> =
      viData.genres || enData?.genres || [];
    const genreNames = rawGenres
      .map((g) => GENRE_MAP_VI[g.id] || g.name)
      .filter(Boolean);

    // Production countries
    const rawCountries: Array<{ iso_3166_1: string; name: string }> =
      viData.production_countries ||
      viData.origin_country?.map((c: string) => ({ iso_3166_1: c, name: c })) ||
      enData?.production_countries ||
      [];
    const countryNames = rawCountries
      .map((c) => COUNTRY_MAP_VI[c.iso_3166_1] || c.name)
      .filter(Boolean);

    // Poster & Backdrop
    const posterPath = viData.poster_path || enData?.poster_path;
    const backdropPath = viData.backdrop_path || enData?.backdrop_path;
    const posterUrl = posterPath
      ? `https://image.tmdb.org/t/p/w780${posterPath}`
      : "";
    const backdropUrl = backdropPath
      ? `https://image.tmdb.org/t/p/original${backdropPath}`
      : "";

    // Trailer lookup
    const allVideos = [
      ...(viData.videos?.results || []),
      ...(enData?.videos?.results || []),
    ];
    const trailers = allVideos.filter(
      (v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"),
    );
    const bestTrailer =
      trailers.find((v: any) => v.official && v.type === "Trailer") ||
      trailers.find((v: any) => v.type === "Trailer") ||
      trailers[0];
    const trailerUrl = bestTrailer?.key
      ? `https://www.youtube.com/watch?v=${bestTrailer.key}`
      : "";

    // Slug
    const baseSlug = slugify(title || originName);
    const slug = year ? `${baseSlug}-${year}` : baseSlug;

    // Directors & Actors
    const credits = viData.credits || {};
    const directors = (credits.crew || [])
      .filter((c: any) => c.job === "Director")
      .map((c: any) => c.name)
      .slice(0, 3);
    const actors = (credits.cast || [])
      .map((c: any) => c.name)
      .slice(0, 8);

    return NextResponse.json({
      success: true,
      data: {
        tmdbId,
        mediaType,
        title,
        originName,
        slug,
        type: mediaType === "tv" ? "series" : "single",
        year,
        quality: "FHD",
        language: "Vietsub",
        posterUrl,
        backdropUrl,
        trailerUrl,
        genres: genreNames.length ? genreNames.join(", ") : "Hành Động, Viễn Tưởng",
        countries: countryNames.length ? Array.from(new Set(countryNames)).join(", ") : "Âu Mỹ",
        description: overview,
        directors,
        actors,
        runtime: viData.runtime || (viData.episode_run_time?.[0]) || undefined,
        totalEpisodes: viData.number_of_episodes || undefined,
        totalSeasons: viData.number_of_seasons || undefined,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Không thể kết nối đến TMDB" },
      { status: 500 },
    );
  }
}
