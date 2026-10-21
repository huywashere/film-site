import HomePageClient from "./HomePageClient";
import { movieApi, type PublicSiteConfiguration } from "@/lib/api";
import {
  CURATED_HERO_FRANCHISE_POOL,
  CURATED_HERO_SLUG_ALIASES,
  ensureSixHeroFilms,
  type CuratedHeroMovie,
} from "@/lib/curated-hero-pool";
import { localImageProxyUrl } from "@/lib/image-cdn";
import {
  preferTmdbBackdropSize,
  preferTmdbPosterSize,
} from "@/lib/hero-image";
import { getMovieTmdbServer } from "@/lib/server/movie-tmdb-server";
import { getMoviePageData } from "@/lib/server/movie-page-data";

export const revalidate = 60;

const heroDetailServerCache = new Map<
  string,
  { film: CuratedHeroMovie; expiresAt: number }
>();

function getDefaultHeroFilms(): CuratedHeroMovie[] {
  // Keep the server paint identical across hard reloads. Browsers retain the
  // previous document while the next response is loading, so a randomized
  // playlist made the old banner visibly flash before the new page appeared.
  return CURATED_HERO_FRANCHISE_POOL.slice(0, 6);
}

async function resolveInitialHeroFilms(heroSlugs?: string[]): Promise<CuratedHeroMovie[]> {
  if (!heroSlugs || !heroSlugs.length) return getDefaultHeroFilms();

  const resolved = await Promise.all(
    heroSlugs.slice(0, 6).map(async (slug) => {
      const cleanSlug = slug.trim();
      if (!cleanSlug) return null;
      const mappedSlug = CURATED_HERO_SLUG_ALIASES[cleanSlug] || cleanSlug;

      // 1. Check curated pool first (immediate return with curated high-res artwork)
      const curated = CURATED_HERO_FRANCHISE_POOL.find(
        (film) => film.slug === mappedSlug || film.slug === cleanSlug,
      );
      if (curated) return curated;

      // 2. Check in-memory detail cache for previously resolved custom hero films
      const cached = heroDetailServerCache.get(mappedSlug);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.film;
      }

      // 3. Fetch from server movie page data for any custom film (direct HTTPS, no relative proxy)
      try {
        const pageData = await getMoviePageData(mappedSlug);
        const movie = pageData?.movie;
        if (!movie || !movie.name) return null;

        const thumb = movie.thumb_url || movie.poster_url;
        const poster = movie.poster_url || movie.thumb_url;

        let resolvedBackdrop = thumb;
        let resolvedPoster = poster;
        let resolvedLogo: string | undefined;

        try {
          const tmdbServer = await Promise.race([
            getMovieTmdbServer(movie),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
          ]);
          if (tmdbServer?.tmdbBackdropUrl) {
            resolvedBackdrop = tmdbServer.tmdbBackdropUrl;
          }
          if (tmdbServer?.tmdbPosterUrl) {
            resolvedPoster = tmdbServer.tmdbPosterUrl;
          }
          if (tmdbServer?.tmdbLogoUrl) {
            resolvedLogo = tmdbServer.tmdbLogoUrl;
          }
        } catch {
          // Keep raw provider images if TMDB resolution fails
        }

        const film: CuratedHeroMovie = {
          _id: movie._id || movie.id || cleanSlug,
          name: movie.name,
          origin_name: movie.origin_name || movie.name,
          slug: movie.slug || cleanSlug,
          type: movie.type || "single",
          tmdbId: movie.tmdb?.id ? Number(movie.tmdb.id) : 0,
          tmdb: movie.tmdb,
          trailer_url: movie.trailer_url,
          poster_url: resolvedPoster,
          thumb_url: resolvedBackdrop || thumb,
          heroBackdrop: resolvedBackdrop || thumb,
          titleLogo: resolvedLogo,
          quality: movie.quality || "HD",
          lang: movie.lang || "Vietsub",
          year: movie.year || undefined,
          vote_average: movie.vote_average || 8.0,
          rating: movie.rating || 8.0,
          content: movie.content,
          genres: Array.isArray(movie.category)
            ? movie.category.map((c: any) => c.name || c)
            : [],
        };
        heroDetailServerCache.set(mappedSlug, {
          film,
          expiresAt: Date.now() + 300_000,
        });
        return film;
      } catch {
        return null;
      }
    }),
  );

  const valid = resolved.filter((film): film is CuratedHeroMovie => Boolean(film));
  return ensureSixHeroFilms(valid) as CuratedHeroMovie[];
}

let cachedPublicConfig: PublicSiteConfiguration | null = null;
let lastConfigFetch = 0;

async function fetchConfigFromEndpoint(
  baseUrl: string,
): Promise<PublicSiteConfiguration | null> {
  try {
    const clean = baseUrl.replace(/\/$/, "");
    const res = await fetch(`${clean}/config/public`, {
      cache: "no-store",
      signal: AbortSignal.timeout(600),
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicSiteConfiguration;
  } catch {
    return null;
  }
}

async function getInitialPublicConfiguration(): Promise<PublicSiteConfiguration | null> {
  const now = Date.now();
  if (cachedPublicConfig && now - lastConfigFetch < 60_000) {
    return cachedPublicConfig;
  }

  // 1. Try Redis directly if available
  const redisUrl = process.env.REDIS_URL?.trim();
  if (redisUrl) {
    try {
      const Redis = (await import("ioredis")).default;
      const client = new Redis(redisUrl, {
        lazyConnect: true,
        connectTimeout: 500,
        maxRetriesPerRequest: 1,
      });
      await client.connect();
      const raw = await client.get("site-config:primary");
      await client.quit();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.heroMovieSlugs)) {
          cachedPublicConfig = {
            maintenanceMode: Boolean(parsed.maintenanceMode),
            maintenanceNotice: parsed.maintenanceNotice,
            announcementText: parsed.announcementText,
            announcementLink: parsed.announcementLink,
            homePopupEnabled: Boolean(parsed.homePopupEnabled),
            homePopupTitle: parsed.homePopupTitle,
            homePopupBody: parsed.homePopupBody,
            homePopupLink: parsed.homePopupLink,
            homePopupLinkLabel: parsed.homePopupLinkLabel,
            homePopupDismissLabel: parsed.homePopupDismissLabel,
            homePopupVersion: parsed.homePopupVersion,
            heroMovieSlugs: parsed.heroMovieSlugs,
            providerPriority: parsed.providerPriority,
            autoSkipIntro: parsed.autoSkipIntro,
            watchPartyEnabled: parsed.watchPartyEnabled,
            homeTop10Slugs: parsed.homeTop10Slugs,
            homeSectionOrder: parsed.homeSectionOrder,
            homeHiddenSections: parsed.homeHiddenSections,
            homeFeaturedRows: parsed.homeFeaturedRows,
            seoTitle: parsed.seoTitle,
            seoDescription: parsed.seoDescription,
            cacheVersion: parsed.cacheVersion,
          };
          lastConfigFetch = now;
          return cachedPublicConfig;
        }
      }
    } catch {
      // Redis fallback to HTTP
    }
  }

  // 2. Try HTTP endpoints in sequence
  const candidates = [
    process.env.API_INTERNAL_URL,
    "http://api:4000/api/v1",
    "http://127.0.0.1:4000/api/v1",
    "http://localhost:4000/api/v1",
    process.env.NEXT_PUBLIC_API_URL,
  ].filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url));

  const dedupedCandidates = [...new Set(candidates)];
  for (const candidate of dedupedCandidates) {
    const fetched = await fetchConfigFromEndpoint(candidate);
    if (fetched && Array.isArray(fetched.heroMovieSlugs)) {
      cachedPublicConfig = fetched;
      lastConfigFetch = now;
      return cachedPublicConfig;
    }
  }

  lastConfigFetch = now;
  return cachedPublicConfig;
}

export default async function HomePage() {
  const initialPublicConfig = await getInitialPublicConfiguration();
  const initialHeroFilms = await resolveInitialHeroFilms(initialPublicConfig?.heroMovieSlugs);
  const initialHero = initialHeroFilms[0];
  const initialDesktopBackdrop = initialHero?.heroBackdrop
    ? localImageProxyUrl(preferTmdbBackdropSize(initialHero.heroBackdrop), { strict: true })
    : null;
  const rawMobile = initialHero?.poster_url || initialHero?.thumb_url || initialHero?.heroBackdrop;
  const initialMobileBackdrop = rawMobile
    ? localImageProxyUrl(
        preferTmdbPosterSize(rawMobile, "w780"),
        { strict: true },
      )
    : null;
  const initialTitleLogo = initialHero?.titleLogo
    ? localImageProxyUrl(initialHero.titleLogo, { strict: true })
    : null;

  return (
    <>
      {initialDesktopBackdrop && (
        <link
          rel="preload"
          as="image"
          href={initialDesktopBackdrop}
          media="(min-width: 768px)"
          fetchPriority="high"
        />
      )}
      {initialMobileBackdrop && (
        <link
          rel="preload"
          as="image"
          href={initialMobileBackdrop}
          media="(max-width: 767px)"
          fetchPriority="high"
        />
      )}
      {initialTitleLogo && (
        <link rel="preload" as="image" href={initialTitleLogo} fetchPriority="high" />
      )}
      <HomePageClient
        initialPublicConfig={initialPublicConfig}
        initialHeroFilms={initialHeroFilms}
      />
    </>
  );
}
