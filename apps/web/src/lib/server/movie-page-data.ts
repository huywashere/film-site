import { cache } from "react";
import { addSignedHlsFallbacksInPayload } from "@/lib/hls-proxy-signature";
import { normalizeVicdnPayload } from "@/lib/vicdn-normalizer";
import { normalizeXinkPayload } from "@/lib/xink-normalizer";

type MoviePagePayload = Record<string, any>;

const PAGE_DATA_REVALIDATE_SECONDS = 60 * 60;
const PAGE_DATA_TIMEOUT_MS = 2_200;

async function fetchGatewayBootstrap(
  slug: string,
): Promise<MoviePagePayload | null> {
  const origin = process.env.MEDIA_GATEWAY_INTERNAL_URL?.trim();
  if (!origin) return null;
  try {
    const response = await fetch(
      `${origin.replace(/\/$/, "")}/v1/movies/${encodeURIComponent(slug)}/bootstrap`,
      {
        signal: AbortSignal.timeout(PAGE_DATA_TIMEOUT_MS),
        next: { revalidate: PAGE_DATA_REVALIDATE_SECONDS },
      },
    );
    if (!response.ok) return null;
    const rawPayload = (await response.json()) as MoviePagePayload;
    const payload = addSignedHlsFallbacksInPayload(rawPayload) as MoviePagePayload;
    return movieFromPayload(payload) ? payload : null;
  } catch {
    return null;
  }
}

function movieFromPayload(payload: MoviePagePayload | null) {
  return payload?.movie || payload?.data?.item || payload?.data?.movie || null;
}

async function fetchProviderPayload(
  url: string,
  source: "kkphim" | "ophim",
): Promise<MoviePagePayload> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(PAGE_DATA_TIMEOUT_MS),
    next: { revalidate: PAGE_DATA_REVALIDATE_SECONDS },
  });
  if (!response.ok) throw new Error(`${source}:${response.status}`);

  const payload = addSignedHlsFallbacksInPayload(
    (await response.json()) as MoviePagePayload,
  ) as MoviePagePayload;
  const movie = movieFromPayload(payload);
  if (!movie) throw new Error(`${source}:empty`);

  const episodes = payload.episodes || payload?.data?.episodes || [];
  return {
    ...payload,
    movie: { ...movie, _source: source },
    episodes,
    _source: source,
  };
}

async function fetchVicdnPayload(slug: string): Promise<MoviePagePayload> {
  const response = await fetch(`https://vicdn.cc/api/info/${encodeURIComponent(slug)}`, {
    headers: { Referer: "https://vicdn.cc/", Origin: "https://vicdn.cc" },
    signal: AbortSignal.timeout(PAGE_DATA_TIMEOUT_MS),
    next: { revalidate: PAGE_DATA_REVALIDATE_SECONDS },
  });
  if (!response.ok) throw new Error(`vicdn:${response.status}`);
  const payload = normalizeVicdnPayload(await response.json()) as MoviePagePayload;
  if (!payload?.movie) throw new Error("vicdn:empty");
  return {
    ...payload,
    _source: "vicdn",
  };
}

async function fetchVodphimPayload(slug: string): Promise<MoviePagePayload> {
  const response = await fetch(`https://api.xink.pro/api/content/phim/${encodeURIComponent(slug)}`, {
    signal: AbortSignal.timeout(PAGE_DATA_TIMEOUT_MS),
    next: { revalidate: PAGE_DATA_REVALIDATE_SECONDS },
  });
  if (!response.ok) throw new Error(`vodphim:${response.status}`);
  const payload = normalizeXinkPayload(await response.json()) as MoviePagePayload;
  if (!payload?.movie) throw new Error("vodphim:empty");
  return {
    ...payload,
    _source: "vodphim",
  };
}

async function fetchInternalApiMovie(slug: string): Promise<MoviePagePayload | null> {
  const apiBase =
    process.env.INTERNAL_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiBase) return null;

  try {
    const response = await fetch(
      `${apiBase.replace(/\/$/, "")}/movies/${encodeURIComponent(slug)}`,
      {
        signal: AbortSignal.timeout(PAGE_DATA_TIMEOUT_MS),
        next: { revalidate: 60 },
      },
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.status && data?.movie) {
      return {
        ...data,
        movie: { ...data.movie, _source: data.movie._source || "flexphim" },
        episodes: data.episodes || [],
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fast, request-deduplicated page bootstrap. Metadata and page rendering share
 * this result, while Next's Data Cache keeps repeat visits off upstream APIs.
 */
export const getMoviePageData = cache(async (slug: string) => {
  const rawSlug = slug.trim();
  const cleanSlug = encodeURIComponent(rawSlug);
  if (!cleanSlug) return null;

  const isVicdnSlug = rawSlug.startsWith("mv-") || rawSlug.startsWith("tv-");
  if (isVicdnSlug) {
    try {
      return await fetchVicdnPayload(rawSlug);
    } catch {
      // Fallback to other providers below
    }
  }

  const candidates: Promise<MoviePagePayload>[] = [];

  if (process.env.INTERNAL_API_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim()) {
    candidates.push(
      fetchInternalApiMovie(rawSlug).then((payload) => {
        if (!payload) throw new Error("internal:empty");
        return payload;
      }),
    );
  }

  if (process.env.MEDIA_GATEWAY_INTERNAL_URL?.trim()) {
    candidates.push(
      fetchGatewayBootstrap(rawSlug).then((payload) => {
        if (!payload) throw new Error("gateway:empty");
        return payload;
      }),
    );
  }

  // KKPhim is the primary detail origin for fast Direct HLS / ArtPlayer playback (~95% of films).
  // Hedge OPhim and VodPhim after 250ms or immediately on primary failure.
  let hedgedTimer: ReturnType<typeof setTimeout> | undefined;
  let startHedged: (() => void) | undefined;

  const primary = fetchProviderPayload(
    `https://phimapi.com/phim/${cleanSlug}`,
    "kkphim",
  );
  candidates.push(primary);

  const hedgedProviders = new Promise<MoviePagePayload>((resolve, reject) => {
    const run = () => {
      hedgedTimer = undefined;
      const hedgedList = [
        fetchProviderPayload(`https://ophim1.com/phim/${cleanSlug}`, "ophim"),
        fetchVodphimPayload(rawSlug),
      ];
      void Promise.any(hedgedList).then(resolve, reject);
    };
    startHedged = run;
    hedgedTimer = setTimeout(run, 250);
  });

  void primary.catch(() => {
    if (!hedgedTimer || !startHedged) return;
    clearTimeout(hedgedTimer);
    startHedged();
  });

  candidates.push(hedgedProviders);

  try {
    return await Promise.any(candidates);
  } catch {
    // Last-ditch ViCDN attempt if not tried yet
    if (!isVicdnSlug) {
      try {
        return await fetchVicdnPayload(rawSlug);
      } catch {
        // Not on ViCDN either
      }
    }
    return null;
  } finally {
    if (hedgedTimer) clearTimeout(hedgedTimer);
  }
});

export function getMovieFromPageData(payload: MoviePagePayload | null) {
  return movieFromPayload(payload);
}
