import type { Metadata } from "next";
import WatchPage from "./WatchPageClient";
import { normalizeMovieArtworkUrl } from "@/lib/movie-image-url";
import { safeJsonLd } from "@/lib/safe-json-ld";
import {
  getMovieFromPageData,
  getMoviePageData,
} from "@/lib/server/movie-page-data";

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

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://netphim.app";
  const watchUrl = epNumber
    ? `${siteUrl}/watch/${slug}?ep=${epNumber}`
    : `${siteUrl}/watch/${slug}`;

  if (!movie) {
    return {
      title: "Xem Phim Online Full HD | FlexPhim",
      description:
        "Xem phim online tốc độ cao, không giật lag, hỗ trợ phụ đề tiếng Việt và thuyết minh tại FlexPhim.",
      openGraph: {
        title: "FlexPhim — Trình Phát Phim Online",
        description: "Xem phim online chất lượng cao 4K tại FlexPhim.",
        url: watchUrl,
        siteName: "FlexPhim",
        type: "video.other",
      },
    };
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

  const rawImage = movie.poster_url || movie.thumb_url;
  const imageUrl =
    normalizeMovieArtworkUrl(rawImage) || `${siteUrl}/flexphim-logo.png`;

  return {
    title: metaTitle,
    description: cleanDesc,
    keywords: [
      name,
      movie.origin_name,
      `xem phim ${name}`,
      `xem phim ${name}${epLabel}`,
      `${name} vietsub`,
      `${name} thuyết minh`,
      "FlexPhim",
    ].filter(Boolean) as string[],
    alternates: {
      canonical: watchUrl,
    },
    openGraph: {
      type: "video.episode",
      url: watchUrl,
      title: `Xem Phim ${name}${originName}${epLabel} - Full HD | FlexPhim`,
      description: cleanDesc,
      siteName: "FlexPhim",
      locale: "vi_VN",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${name}${epLabel}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `Xem Phim ${name}${originName}${epLabel} - Full HD | FlexPhim`,
      description: cleanDesc,
      images: [imageUrl],
    },
  };
}

export default async function WatchPageWrapper({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || "";
  const initialData = await getMoviePageData(slug);
  const movie = getMovieFromPageData(initialData);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://netphim.app";
  const watchUrl = `${siteUrl}/watch/${slug}`;

  const jsonLd = movie
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: `Xem phim ${movie.name || movie.title || slug}`,
        description: movie.content
          ? movie.content.replace(/<[^>]*>?/gm, "").trim()
          : `Xem phim ${movie.name} online tại FlexPhim`,
        thumbnailUrl: normalizeMovieArtworkUrl(
          movie.poster_url || movie.thumb_url,
        ),
        uploadDate: movie.year ? `${movie.year}-01-01` : undefined,
        contentUrl: watchUrl,
        embedUrl: watchUrl,
      }
    : null;

  return (
    <>
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
