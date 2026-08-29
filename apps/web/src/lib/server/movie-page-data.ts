import { cache } from "react";
import { addSignedHlsFallbacksInPayload } from "@/lib/hls-proxy-signature";

type MoviePagePayload = Record<string, any>;

const PAGE_DATA_REVALIDATE_SECONDS = 60 * 60;
const PAGE_DATA_TIMEOUT_MS = 1_800;

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
    const payload = (await response.json()) as MoviePagePayload;
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

/**
 * Fast, request-deduplicated page bootstrap. Metadata and page rendering share
 * this result, while Next's Data Cache keeps repeat visits off upstream APIs.
 */
export const getMoviePageData = cache(async (slug: string) => {
  const cleanSlug = encodeURIComponent(slug.trim());
  if (!cleanSlug) return null;

  const gatewayPayload = await fetchGatewayBootstrap(slug.trim());
  if (gatewayPayload) return gatewayPayload;

  // OPhim is usually the faster detail origin. Hedge KKPhim after a short
  // delay instead of hitting both providers on every page view. A healthy
  // primary response therefore costs one upstream request, while slow/failing
  // requests still retain the fast multi-provider fallback behavior.
  let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
  let startFallback: (() => void) | undefined;
  const primary = fetchProviderPayload(
    `https://ophim1.com/phim/${cleanSlug}`,
    "ophim",
  );
  const fallback = new Promise<MoviePagePayload>((resolve, reject) => {
    const run = () => {
      fallbackTimer = undefined;
      void fetchProviderPayload(
        `https://phimapi.com/phim/${cleanSlug}`,
        "kkphim",
      ).then(resolve, reject);
    };
    startFallback = run;
    fallbackTimer = setTimeout(run, 250);
  });
  void primary.catch(() => {
    if (!fallbackTimer || !startFallback) return;
    clearTimeout(fallbackTimer);
    startFallback();
  });

  try {
    return await Promise.any([primary, fallback]);
  } catch {
    return null;
  } finally {
    if (fallbackTimer) clearTimeout(fallbackTimer);
  }
});

export function getMovieFromPageData(payload: MoviePagePayload | null) {
  return movieFromPayload(payload);
}
