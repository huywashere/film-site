import type { Metadata } from "next";
import FilmDetailPage from "./FilmDetailClient";
import { normalizeMovieArtworkUrl } from "@/lib/movie-image-url";
import { safeJsonLd } from "@/lib/safe-json-ld";
import {
  getMovieFromPageData,
  getMoviePageData,
} from "@/lib/server/movie-page-data";
import { getMovieTmdbServer } from "@/lib/server/movie-tmdb-server";
import { tmdbLogo } from "@/lib/tmdb";
import { buildArtworkCandidates } from "@/lib/image-cdn";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams?:
    | Promise<{ [key: string]: string | string[] | undefined }>
    | { [key: string]: string | string[] | undefined };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || "";
  const movie = getMovieFromPageData(await getMoviePageData(slug));

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://netphim.app";
  const filmUrl = `${siteUrl}/film/${slug}`;

  if (!movie) {
    return {
      title: "Xem Phim Online | FlexPhim",
      description:
        "Nền tảng xem phim online chất lượng cao Full HD. Phim bộ, phim lẻ, hoạt hình với phụ đề tiếng Việt.",
      openGraph: {
        title: "FlexPhim — Xem Phim Online Chất Lượng Cao",
        description: "Xem phim online miễn phí Full HD tại FlexPhim.",
        url: filmUrl,
        siteName: "FlexPhim",
        type: "website",
      },
    };
  }

  const name = movie.name || movie.title || slug;
  const originName = movie.origin_name ? ` (${movie.origin_name})` : "";
  const year = movie.year ? ` - ${movie.year}` : "";
  const metaTitle = `${name}${originName}${year} | FlexPhim`;

  const rawDesc = movie.content || movie.description || "";
  const cleanDesc = rawDesc
    ? rawDesc
        .replace(/<[^>]*>?/gm, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180) + "..."
    : `Xem phim ${name} online Full HD Vietsub thuyết minh chất lượng cao miễn phí tại FlexPhim.`;

  const tmdbServer = await getMovieTmdbServer(movie);
  const rawImage = movie.poster_url || movie.thumb_url;
  const imageUrl =
    tmdbServer?.tmdbBackdropUrl ||
    tmdbServer?.tmdbPosterUrl ||
    normalizeMovieArtworkUrl(rawImage) ||
    `${siteUrl}/flexphim-logo.png`;

  const keywords = [
    name,
    movie.origin_name,
    `phim ${name}`,
    `xem phim ${name}`,
    `${name} vietsub`,
    `${name} thuyết minh`,
    `${name} full hd`,
    "FlexPhim",
    "xem phim online",
  ].filter(Boolean) as string[];

  return {
    title: metaTitle,
    description: cleanDesc,
    keywords,
    alternates: {
      canonical: filmUrl,
    },
    openGraph: {
      type: "video.movie",
      url: filmUrl,
      title: `${name}${originName} - Full HD Vietsub | FlexPhim`,
      description: cleanDesc,
      siteName: "FlexPhim",
      locale: "vi_VN",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name}${originName} - Full HD Vietsub | FlexPhim`,
      description: cleanDesc,
      images: [imageUrl],
    },
  };
}

export default async function FilmPage({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || "";
  const initialData = await getMoviePageData(slug);
  const movie = getMovieFromPageData(initialData);
  const initialTmdb = await getMovieTmdbServer(movie);
  const initialLogoUrl =
    initialTmdb?.tmdbLogoUrl ||
    tmdbLogo(
      initialTmdb?.bestLogo?.file_path ||
        initialTmdb?.images?.logos?.[0]?.file_path,
      "w500",
    );
  const initialOptimizedLogoUrl = initialLogoUrl
    ? buildArtworkCandidates([initialLogoUrl], "titleLogo", {
        includeWsrvForTmdb: true,
        strictProxy: true,
      })[0] || initialLogoUrl
    : null;

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://netphim.app";
  const filmUrl = `${siteUrl}/film/${slug}`;

  // JSON-LD Structured Data Schema for Google Rich Snippets
  const jsonLd = movie
    ? {
        "@context": "https://schema.org",
        "@type": movie.type === "series" ? "TVSeries" : "Movie",
        name: movie.name || movie.title || slug,
        alternateName: movie.origin_name,
        description: movie.content
          ? movie.content.replace(/<[^>]*>?/gm, "").trim()
          : undefined,
        image:
          initialTmdb?.tmdbBackdropUrl ||
          initialTmdb?.tmdbPosterUrl ||
          normalizeMovieArtworkUrl(movie.poster_url || movie.thumb_url),
        url: filmUrl,
        datePublished: movie.year ? `${movie.year}-01-01` : undefined,
        genre: Array.isArray(movie.category)
          ? movie.category.map((c: any) => c.name || c)
          : undefined,
        aggregateRating:
          movie.tmdb?.vote_average || movie.vote_average
            ? {
                "@type": "AggregateRating",
                ratingValue: Number(
                  movie.tmdb?.vote_average || movie.vote_average || 8.5,
                ).toFixed(1),
                bestRating: "10",
                worstRating: "1",
                ratingCount: Number(
                  movie.tmdb?.vote_count || movie.vote_count || 100,
                ),
              }
            : undefined,
      }
    : null;

  return (
    <>
      {initialOptimizedLogoUrl && (
        <link
          rel="preload"
          as="image"
          href={initialOptimizedLogoUrl}
          fetchPriority="high"
        />
      )}
      {initialTmdb?.tmdbBackdropUrl && (
        <link
          rel="preload"
          as="image"
          href={initialTmdb.tmdbBackdropUrl}
          fetchPriority="high"
        />
      )}
      {initialTmdb?.tmdbPosterUrl && (
        <link
          rel="preload"
          as="image"
          href={initialTmdb.tmdbPosterUrl}
          fetchPriority="high"
        />
      )}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
        />
      )}
      <FilmDetailPage initialData={initialData} initialTmdb={initialTmdb} />
    </>
  );
}
