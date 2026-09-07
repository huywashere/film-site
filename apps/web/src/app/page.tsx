import HomePageClient from "./HomePageClient";
import type { PublicSiteConfiguration } from "@/lib/api";
import { CURATED_HERO_FRANCHISE_POOL } from "@/lib/curated-hero-pool";

export const revalidate = 60;

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
  const pinnedSlug = initialPublicConfig?.heroMovieSlugs?.[0];
  const initialHero =
    CURATED_HERO_FRANCHISE_POOL.find((film) => film.slug === pinnedSlug) ||
    CURATED_HERO_FRANCHISE_POOL[0];

  return (
    <>
      {initialHero?.heroBackdrop && (
        <link
          rel="preload"
          as="image"
          href={initialHero.heroBackdrop}
          media="(min-width: 768px)"
          fetchPriority="high"
        />
      )}
      {initialHero?.poster_url && (
        <link
          rel="preload"
          as="image"
          href={initialHero.poster_url.replace('/t/p/w500/', '/t/p/w780/')}
          media="(max-width: 767px)"
          fetchPriority="high"
        />
      )}
      {initialHero?.titleLogo && (
        <link rel="preload" as="image" href={initialHero.titleLogo} fetchPriority="high" />
      )}
      <HomePageClient initialPublicConfig={initialPublicConfig} />
    </>
  );
}
