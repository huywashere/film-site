import { NextRequest, NextResponse } from "next/server";
import { normalizeForSearch } from "@/lib/text-utils";
import { tmdbBackdrop, tmdbPoster } from "@/lib/tmdb";
import { isFilmMatch } from "@/lib/actor-film-matcher";
import {
  CURATED_CHINESE_HERO_POOL,
  CURATED_KOREAN_HERO_POOL,
  CURATED_ANIME_HERO_POOL,
} from "@/lib/curated-asian-hero";
import { CURATED_HERO_FRANCHISE_POOL } from "@/lib/curated-hero-pool";
import {
  CURATED_SCIFI_HERO_POOL,
  CURATED_WAR_HERO_POOL,
} from "@/lib/curated-genre-pools";

export const dynamic = "force-dynamic";

interface CachedResult {
  data: {
    films: any[];
    total: number;
    actorName: string;
  };
  expiry: number;
}

const memoryCache = new Map<number, CachedResult>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 giờ

// Hợp nhất các kho curated có sẵn trong hệ thống
const ALL_CURATED_POOLS = [
  ...CURATED_CHINESE_HERO_POOL,
  ...CURATED_KOREAN_HERO_POOL,
  ...CURATED_ANIME_HERO_POOL,
  ...CURATED_HERO_FRANCHISE_POOL,
  ...CURATED_SCIFI_HERO_POOL,
  ...CURATED_WAR_HERO_POOL,
];

function getTmdbAuth() {
  const tmdbToken = process.env.TMDB_ACCESS_TOKEN?.trim() || "";
  const tmdbApiKey = process.env.TMDB_API_KEY?.trim() || "";
  const isValidToken =
    Boolean(tmdbToken) &&
    tmdbToken !== "your-read-access-token-here" &&
    tmdbToken.startsWith("eyJ");

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (isValidToken) {
    headers.Authorization = `Bearer ${tmdbToken}`;
  }

  const appendKey = (url: string) => {
    if (!isValidToken && tmdbApiKey) {
      const sep = url.includes("?") ? "&" : "?";
      return `${url}${sep}api_key=${encodeURIComponent(tmdbApiKey)}`;
    }
    return url;
  };

  return { headers, appendKey };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const personIdParam = searchParams.get("personId");
  const personId = Number(personIdParam);

  if (!personId || Number.isNaN(personId)) {
    return NextResponse.json({ films: [], total: 0, actorName: "" });
  }

  // 1. Kiểm tra bộ nhớ đệm
  const cached = memoryCache.get(personId);
  if (cached && cached.expiry > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const { headers, appendKey } = getTmdbAuth();
    const TMDB_HOST = "https://api.themoviedb.org/3";

    // 2. Lấy thông tin diễn viên và credits từ TMDB (có tiếng Việt)
    const [personRes, creditsRes] = await Promise.all([
      fetch(appendKey(`${TMDB_HOST}/person/${personId}?language=vi-VN`), {
        headers,
        signal: AbortSignal.timeout(5000),
      }).catch(() => null),
      fetch(
        appendKey(
          `${TMDB_HOST}/person/${personId}/combined_credits?language=vi-VN`,
        ),
        {
          headers,
          signal: AbortSignal.timeout(5000),
        },
      ).catch(() => null),
    ]);

    const personDetail = personRes?.ok ? await personRes.json() : null;
    const credits = creditsRes?.ok ? await creditsRes.json() : null;

    const actorName = personDetail?.name || "";
    const alsoKnownAs: string[] = personDetail?.also_known_as || [];
    const allNamesNormalized = [
      actorName,
      ...alsoKnownAs,
    ].map(normalizeForSearch);

    const rawCast: any[] = credits?.cast || [];
    const seenTmdbIds = new Set<number>();
    const seenSlugs = new Set<string>();
    const verifiedFilms: any[] = [];

    // 3. Kiểm tra trước với các kho phim curated có sẵn trong hệ thống
    for (const hero of ALL_CURATED_POOLS) {
      if (!hero?.slug || seenSlugs.has(hero.slug)) continue;

      let matched = false;
      let matchedChar = "";

      // Khớp theo characterCards
      const characterCards = (hero as any).characterCards;
      if (characterCards?.length) {
        for (const c of characterCards) {
          if (
            c.actorId === personId ||
            allNamesNormalized.includes(normalizeForSearch(c.actorName || ""))
          ) {
            matched = true;
            matchedChar = c.characterName || "";
            break;
          }
        }
      }

      // Khớp theo tmdbId
      const heroTmdbId = Number((hero as any).tmdbId || hero.tmdb?.id);
      if (!matched && heroTmdbId) {
        const matchingCredit = rawCast.find((c) => c.id === heroTmdbId);
        if (matchingCredit) {
          matched = true;
          matchedChar = matchingCredit.character || "";
        }
      }

      if (matched) {
        seenSlugs.add(hero.slug);
        if (heroTmdbId) seenTmdbIds.add(heroTmdbId);
        verifiedFilms.push({
          _id: hero._id || hero.slug,
          slug: hero.slug,
          name: hero.name,
          origin_name: hero.origin_name || hero.name,
          thumb_url: hero.thumb_url || hero.poster_url,
          poster_url: hero.poster_url || hero.thumb_url,
          year: hero.year || 2024,
          quality: hero.quality || "4K VIP",
          lang: hero.lang || "Vietsub + Thuyết Minh",
          episode_current:
            hero.episode_current ||
            (hero.type === "series" ? "Trọn bộ" : "Full"),
          vote_average: Number(hero.vote_average || hero.rating || 9.2),
          character: matchedChar,
          media_type: hero.type === "series" ? "tv" : "movie",
        });
      }
    }

    // 4. Lọc danh sách phim ứng viên nổi bật từ TMDB credits
    const candidateCredits = rawCast
      .filter((item) => {
        if (!item?.id || seenTmdbIds.has(item.id)) return false;
        return Boolean(item.title || item.name || item.original_title);
      })
      .sort((a, b) => {
        const scoreA =
          (Number(a.popularity) || 0) * 2 + (Number(a.vote_count) || 0);
        const scoreB =
          (Number(b.popularity) || 0) * 2 + (Number(b.vote_count) || 0);
        return scoreB - scoreA;
      })
      .slice(0, 30); // Lấy tối đa 30 phim nổi bật nhất để kiểm tra

    // 5. Kiểm tra đối chiếu với API hệ thống (PhimAPI/KKPhim)
    const checkCreditInSystem = async (credit: any) => {
      const tmdbCreditId = credit.id;
      const titleVi = credit.title || credit.name || "";
      const titleOrigin = credit.original_title || credit.original_name || "";
      const creditYear = Number(
        (credit.release_date || credit.first_air_date || "").slice(0, 4),
      );

      // Ưu tiên từ khóa tìm kiếm: Tiêu đề Việt hóa, hoặc Tiêu đề gốc
      const searchTerms = [titleVi, titleOrigin]
        .map((t) => t.trim())
        .filter((t) => t.length > 1 && !/^[^\p{L}\p{N}]+$/u.test(t));

      const uniqueTerms = Array.from(new Set(searchTerms));

      for (const term of uniqueTerms) {
        try {
          const res = await fetch(
            `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(term)}&limit=3`,
            { signal: AbortSignal.timeout(3500) },
          );
          if (!res.ok) continue;

          const data = await res.json();
          const items: any[] = data?.data?.items || data?.items || [];

          for (const item of items) {
            if (!item?.slug || seenSlugs.has(item.slug)) continue;

            if (isFilmMatch(item, credit)) {
              seenSlugs.add(item.slug);
              seenTmdbIds.add(tmdbCreditId);

              const pUrl =
                item.poster_url || tmdbPoster(credit.poster_path, "w342") || "";
              const tUrl =
                item.thumb_url ||
                tmdbBackdrop(credit.backdrop_path, "w780") ||
                pUrl;

              return {
                _id: item._id || item.slug,
                slug: item.slug,
                name: item.name,
                origin_name: item.origin_name || titleOrigin || titleVi,
                thumb_url: tUrl,
                poster_url: pUrl,
                year: item.year || creditYear || 2024,
                quality: item.quality || "FHD",
                lang: item.lang || "Vietsub",
                episode_current:
                  item.episode_current ||
                  (credit.media_type === "tv" ? "Đang cập nhật" : "Full"),
                vote_average: Number(
                  item.vote_average || credit.vote_average || 8.5,
                ),
                character: credit.character || "",
                media_type:
                  item.type === "series" || credit.media_type === "tv"
                    ? "tv"
                    : "movie",
              };
            }
          }
        } catch {
          // Bỏ qua lỗi timeout của từng truy vấn
        }
      }

      return null;
    };

    // Chạy song song theo đợt (chunks) 6 requests để tối ưu tốc độ và không nghẽn mạng
    const CHUNK_SIZE = 6;
    for (let i = 0; i < candidateCredits.length; i += CHUNK_SIZE) {
      const chunk = candidateCredits.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(
        chunk.map((c) => checkCreditInSystem(c)),
      );
      for (const res of chunkResults) {
        if (res) verifiedFilms.push(res);
      }
    }

    // 6. Sắp xếp danh sách phim: Phim mới nhất lên đầu
    verifiedFilms.sort((a, b) => (b.year || 0) - (a.year || 0));

    const responsePayload = {
      films: verifiedFilms,
      total: verifiedFilms.length,
      actorName,
    };

    // Lưu vào bộ nhớ đệm 1 giờ
    memoryCache.set(personId, {
      data: responsePayload,
      expiry: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("[ActorFilms] Error resolving actor films:", error);
    return NextResponse.json({ films: [], total: 0, actorName: "" });
  }
}
