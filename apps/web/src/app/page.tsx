import HomePageClient from "./HomePageClient";
import type { PublicSiteConfiguration } from "@/lib/api";
import { CURATED_HERO_FRANCHISE_POOL } from "@/lib/curated-hero-pool";
import { localImageProxyUrl } from "@/lib/image-cdn";

export const revalidate = 60;

function pickRandomHeroFilms() {
  const pool = [...CURATED_HERO_FRANCHISE_POOL];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool.slice(0, 6);
}

async function getInitialPublicConfiguration(): Promise<PublicSiteConfiguration | null> {
  const apiBase = (
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:3001/api/v1"
  ).replace(/\/$/, "");

  try {
    const response = await fetch(`${apiBase}/config/public`, {
      next: { revalidate: 60, tags: ["public-site-configuration"] },
      // The public configuration is optional for the first paint. Do not let a
      // sleeping/unreachable API hold the whole homepage HTML response open.
      signal: AbortSignal.timeout(900),
    });
    if (!response.ok) return null;
    return (await response.json()) as PublicSiteConfiguration;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const initialPublicConfig = await getInitialPublicConfiguration();
  const pinnedHeroFilms = (initialPublicConfig?.heroMovieSlugs || [])
    .map((slug) => CURATED_HERO_FRANCHISE_POOL.find((film) => film.slug === slug))
    .filter((film): film is (typeof CURATED_HERO_FRANCHISE_POOL)[number] => Boolean(film))
    .slice(0, 6);
  const initialHeroFilms = pinnedHeroFilms.length
    ? pinnedHeroFilms
    : pickRandomHeroFilms();
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
      {initialHero?.titleLogo && (
        <link rel="preload" as="image" href={initialHero.titleLogo} fetchPriority="high" />
      )}
      <HomePageClient
        initialPublicConfig={initialPublicConfig}
        initialHeroFilms={initialHeroFilms}
      />
    </>
  );
}
