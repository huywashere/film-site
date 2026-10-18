import type { Metadata } from "next";
import WatchPage from "./WatchPageClient";
import { normalizeMovieArtworkUrl } from "@/lib/movie-image-url";
import { safeJsonLd } from "@/lib/safe-json-ld";
import {
  getMovieFromPageData,
  getMoviePageData,
} from "@/lib/server/movie-page-data";
import { getMovieTmdbServer } from "@/lib/server/movie-tmdb-server";
import { getSiteUrl, buildSeoMetadata, resolveOgImageUrl } from "@/lib/seo";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams?:
    | Promise<{ [key: string]: string | string[] | undefined }>
    | { [key: string]: string | string[] | undefined };
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) || {};
  const slug = resolvedParams?.slug || "";
  const epParam = resolvedSearchParams?.ep;
  const epNumber = Array.isArray(epParam) ? epParam[0] : epParam;

  const movie = getMovieFromPageData(await getMoviePageData(slug));
  const pagePath = epNumber ? `/watch/${slug}?ep=${epNumber}` : `/watch/${slug}`;

  if (!movie) {
    return buildSeoMetadata({
      title: "Xem Phim Online Full HD | FlexPhim",
      description:
        "Xem phim online tốc độ cao, không giật lag, hỗ trợ phụ đề tiếng Việt và thuyết minh tại FlexPhim.",
      path: pagePath,
      type: "video.other",
    });
  }

  const name = movie.name || movie.title || slug;
  const originName = movie.origin_name ? ` (${movie.origin_name})` : "";
  const epLabel = epNumber ? ` - Tập ${epNumber}` : "";
  const metaTitle = `Xem Phim ${name}${originName}${epLabel} | FlexPhim`;

  const rawDesc = movie.content || movie.description || "";
  const cleanDesc = rawDesc
    ? rawDesc
        .replace(/<[^>]*>?/gm, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180) + "..."
    : `Xem phim ${name}${epLabel} online Full HD Vietsub thuyết minh chất lượng cao miễn phí tại FlexPhim.`;

  const tmdbServer = await getMovieTmdbServer(movie);
  const rawImage = movie.poster_url || movie.thumb_url;
  const imageUrl =
    tmdbServer?.tmdbBackdropUrl ||
    tmdbServer?.tmdbPosterUrl ||
    normalizeMovieArtworkUrl(rawImage);

  return buildSeoMetadata({
    title: metaTitle,
    description: cleanDesc,
    path: pagePath,
    imageUrl,
    imageAlt: `${name}${epLabel}`,
    type: "video.episode",
    keywords: [
      name,
      movie.origin_name,
      `xem phim ${name}`,
      `xem phim ${name}${epLabel}`,
      `${name} vietsub`,
      `${name} thuyết minh`,
      "FlexPhim",
    ].filter(Boolean) as string[],
  });
}

export default async function WatchPageWrapper({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || "";
  const initialData = await getMoviePageData(slug);
  const movie = getMovieFromPageData(initialData);

  const siteUrl = getSiteUrl();
  const watchUrl = `${siteUrl}/watch/${slug}`;

  const jsonLd = movie
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: `Xem phim ${movie.name || movie.title || slug}`,
        description: movie.content
          ? movie.content.replace(/<[^>]*>?/gm, "").trim()
          : `Xem phim ${movie.name} online tại FlexPhim`,
        thumbnailUrl: resolveOgImageUrl(
          movie.poster_url || movie.thumb_url,
        ),
        uploadDate: movie.year ? `${movie.year}-01-01` : undefined,
        contentUrl: watchUrl,
        embedUrl: watchUrl,
      }
    : null;

  return (
    <>
      <link rel="preconnect" href="https://image.tmdb.org" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://phimimg.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://phimapi.com" />
      <link rel="dns-prefetch" href="https://kkphimplayer.com" />
      <link rel="dns-prefetch" href="https://vicdn.cc" />
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
        />
      )}
      <WatchPage initialData={initialData} />
    </>
  );
}
