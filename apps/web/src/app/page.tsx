import HomePageClient from "./HomePageClient";
import { movieApi, type PublicSiteConfiguration } from "@/lib/api";
import {
  CURATED_HERO_FRANCHISE_POOL,
  CURATED_HERO_SLUG_ALIASES,
  ensureSixHeroFilms,
  type CuratedHeroMovie,
} from "@/lib/curated-hero-pool";
import { localImageProxyUrl } from "@/lib/image-cdn";

export const revalidate = 60;

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

      // 2. Fetch from movie detail API for any custom film
      try {
        const detailRes = await Promise.race([
          movieApi.getDetail(mappedSlug),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200)),
        ]);
        if (!detailRes) return null;

        const data = (detailRes as any)?.data;
        const movie = data?.movie || data?.data?.movie || data?.data?.item || data?.item;
        if (!movie || !movie.name) return null;

        const thumb = movie.thumb_url || movie.poster_url;
        const poster = movie.poster_url || movie.thumb_url;

        const film: CuratedHeroMovie = {
          _id: movie._id || movie.id || cleanSlug,
          name: movie.name,
          origin_name: movie.origin_name || movie.name,
          slug: movie.slug || cleanSlug,
          type: movie.type || "single",
          tmdbId: movie.tmdb?.id ? Number(movie.tmdb.id) : 0,
          tmdb: movie.tmdb,
          trailer_url: movie.trailer_url,
          poster_url: poster,
          thumb_url: thumb,
          heroBackdrop: thumb,
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
        return film;
      } catch {
        return null;
      }
    }),
  );

  const valid = resolved.filter((film): film is CuratedHeroMovie => Boolean(film));
  return ensureSixHeroFilms(valid) as CuratedHeroMovie[];
}

async function getInitialPublicConfiguration(): Promise<PublicSiteConfiguration | null> {
  const apiBase = (
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:4000/api/v1"
  ).replace(/\/$/, "");

  try {
    const response = await fetch(`${apiBase}/config/public`, {
      next: { revalidate: 60, tags: ["public-site-configuration"] },
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return null;
    return (await response.json()) as PublicSiteConfiguration;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const initialPublicConfig = await getInitialPublicConfiguration();
  const initialHeroFilms = await resolveInitialHeroFilms(initialPublicConfig?.heroMovieSlugs);
  const initialHero = initialHeroFilms[0];
  const initialDesktopBackdrop = initialHero?.heroBackdrop
    ? localImageProxyUrl(initialHero.heroBackdrop, { strict: true })
    : null;
  const initialMobileBackdrop = initialHero?.poster_url
    ? localImageProxyUrl(
        initialHero.poster_url.replace("/t/p/w500/", "/t/p/w780/"),
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
