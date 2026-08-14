import type { Metadata } from "next";
import FilmDetailPage from "./FilmDetailClient";
import { normalizeMovieArtworkUrl } from "@/lib/movie-image-url";
import { safeJsonLd } from "@/lib/safe-json-ld";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams?:
    | Promise<{ [key: string]: string | string[] | undefined }>
    | { [key: string]: string | string[] | undefined };
}

async function fetchFilmMetadata(slug: string) {
  const cleanSlug = encodeURIComponent(slug.trim());
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(`https://phimapi.com/phim/${cleanSlug}`, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data?.movie || data?.data?.item || null;
  } catch (_err) {
    clearTimeout(timeoutId);
    // Fallback to OPhim if KKPhim is unavailable
    try {
      const resOphim = await fetch(`https://ophim1.com/phim/${cleanSlug}`, {
        next: { revalidate: 3600 },
      });
      if (resOphim.ok) {
        const dataOphim = await resOphim.json();
        return dataOphim?.movie || dataOphim?.data?.item || null;
      }
    } catch {
      // Ignore fallback error
    }
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || "";
  const movie = await fetchFilmMetadata(slug);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://film-site-web.vercel.app";
  const filmUrl = `${siteUrl}/film/${slug}`;

  if (!movie) {
    return {
      title: "Xem Phim Online | NetPhim",
      description:
        "Nền tảng xem phim online chất lượng cao 4K. Phim bộ, phim lẻ, hoạt hình với phụ đề tiếng Việt.",
      openGraph: {
        title: "NetPhim — Xem Phim Online Chất Lượng Cao",
        description: "Xem phim online miễn phí Full HD/4K tại NetPhim.",
        url: filmUrl,
        siteName: "NetPhim",
        type: "website",
      },
    };
  }

  const name = movie.name || movie.title || slug;
  const originName = movie.origin_name ? ` (${movie.origin_name})` : "";
  const year = movie.year ? ` - ${movie.year}` : "";
  const metaTitle = `${name}${originName}${year} | NetPhim`;

  const rawDesc = movie.content || movie.description || "";
  const cleanDesc = rawDesc
    ? rawDesc
        .replace(/<[^>]*>?/gm, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180) + "..."
    : `Xem phim ${name} online Full HD Vietsub thuyết minh chất lượng cao miễn phí tại NetPhim.`;

  const rawImage = movie.poster_url || movie.thumb_url;
  const imageUrl =
    normalizeMovieArtworkUrl(rawImage) || `${siteUrl}/cinephim-logo.png`;

  const keywords = [
    name,
    movie.origin_name,
    `phim ${name}`,
    `xem phim ${name}`,
    `${name} vietsub`,
    `${name} thuyết minh`,
    `${name} full hd`,
    "NetPhim",
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
      title: `${name}${originName} - Full HD Vietsub | NetPhim`,
      description: cleanDesc,
      siteName: "NetPhim",
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
      title: `${name}${originName} - Full HD Vietsub | NetPhim`,
      description: cleanDesc,
      images: [imageUrl],
    },
  };
}

export default async function FilmPage({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || "";
  const movie = await fetchFilmMetadata(slug);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://film-site-web.vercel.app";
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
        image: normalizeMovieArtworkUrl(movie.poster_url || movie.thumb_url),
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
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
        />
      )}
      <FilmDetailPage />
    </>
  );
}
