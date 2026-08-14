import type { Metadata } from "next";
import WatchPage from "./WatchPageClient";
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
  searchParams,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) || {};
  const slug = resolvedParams?.slug || "";
  const epParam = resolvedSearchParams?.ep;
  const epNumber = Array.isArray(epParam) ? epParam[0] : epParam;

  const movie = await fetchFilmMetadata(slug);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://film-site-web.vercel.app";
  const watchUrl = epNumber
    ? `${siteUrl}/watch/${slug}?ep=${epNumber}`
    : `${siteUrl}/watch/${slug}`;

  if (!movie) {
    return {
      title: "Xem Phim Online Full HD | NetPhim",
      description:
        "Xem phim online tốc độ cao, không giật lag, hỗ trợ phụ đề tiếng Việt và thuyết minh tại NetPhim.",
      openGraph: {
        title: "NetPhim — Trình Phát Phim Online",
        description: "Xem phim online chất lượng cao 4K tại NetPhim.",
        url: watchUrl,
        siteName: "NetPhim",
        type: "video.other",
      },
    };
  }

  const name = movie.name || movie.title || slug;
  const originName = movie.origin_name ? ` (${movie.origin_name})` : "";
  const epLabel = epNumber ? ` - Tập ${epNumber}` : "";
  const metaTitle = `Xem Phim ${name}${originName}${epLabel} | NetPhim`;

  const rawDesc = movie.content || movie.description || "";
  const cleanDesc = rawDesc
    ? rawDesc
        .replace(/<[^>]*>?/gm, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180) + "..."
    : `Xem phim ${name}${epLabel} online Full HD Vietsub thuyết minh chất lượng cao miễn phí tại NetPhim.`;

  const rawImage = movie.poster_url || movie.thumb_url;
  const imageUrl =
    normalizeMovieArtworkUrl(rawImage) || `${siteUrl}/cinephim-logo.png`;

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
      "NetPhim",
    ].filter(Boolean) as string[],
    alternates: {
      canonical: watchUrl,
    },
    openGraph: {
      type: "video.episode",
      url: watchUrl,
      title: `Xem Phim ${name}${originName}${epLabel} - Full HD | NetPhim`,
      description: cleanDesc,
      siteName: "NetPhim",
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
      title: `Xem Phim ${name}${originName}${epLabel} - Full HD | NetPhim`,
      description: cleanDesc,
      images: [imageUrl],
    },
  };
}

export default async function WatchPageWrapper({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || "";
  const movie = await fetchFilmMetadata(slug);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://film-site-web.vercel.app";
  const watchUrl = `${siteUrl}/watch/${slug}`;

  const jsonLd = movie
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: `Xem phim ${movie.name || movie.title || slug}`,
        description: movie.content
          ? movie.content.replace(/<[^>]*>?/gm, "").trim()
          : `Xem phim ${movie.name} online tại NetPhim`,
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
      <WatchPage />
    </>
  );
}
