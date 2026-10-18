import type { Metadata } from "next";

/**
 * Resolves the canonical, publicly reachable site origin.
 * Avoids dead or dummy domains like `netphim.app` or `localhost`.
 */
export function getSiteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  // If a valid custom domain is provided and NOT the dead netphim.app placeholder
  if (
    configured &&
    /^https?:\/\//i.test(configured) &&
    !configured.includes("netphim.app")
  ) {
    return configured.replace(/\/+$/, "");
  }

  // Vercel deployment domain variables
  const vercelProject =
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProject) {
    return `https://${vercelProject.replace(/\/+$/, "")}`;
  }

  const vercelUrl =
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/+$/, "")}`;
  }

  // Deployed production default
  return "https://film-site-web.vercel.app";
}

/**
 * Converts a relative path or candidate URL into an absolute URL.
 */
export function absoluteUrl(path?: string | null): string {
  if (!path) return getSiteUrl();
  const trimmed = path.trim();
  if (!trimmed) return getSiteUrl();

  if (/^https?:\/\//i.test(trimmed)) {
    // If it mistakenly points to the dead domain, rewrite to the active site URL
    if (trimmed.includes("netphim.app")) {
      try {
        const parsed = new URL(trimmed);
        return `${getSiteUrl()}${parsed.pathname}${parsed.search}`;
      } catch {
        return getSiteUrl();
      }
    }
    return trimmed;
  }

  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${getSiteUrl()}${cleanPath}`;
}

/**
 * Standard Open Graph banner configuration
 */
export const DEFAULT_OG_IMAGE_PATH = "/og-img/background.png";

export function getDefaultOgImage(): {
  url: string;
  width: number;
  height: number;
  alt: string;
  type: string;
} {
  return {
    url: absoluteUrl(DEFAULT_OG_IMAGE_PATH),
    width: 1200,
    height: 630,
    alt: "FlexPhim — Nền Tảng Xem Phim Online Chất Lượng Cao",
    type: "image/png",
  };
}

/**
 * Resolves a social-share safe absolute image URL for Open Graph and Twitter Cards.
 */
export function resolveOgImageUrl(candidate?: string | null): string {
  if (!candidate) return absoluteUrl(DEFAULT_OG_IMAGE_PATH);
  const trimmed = candidate.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") {
    return absoluteUrl(DEFAULT_OG_IMAGE_PATH);
  }

  if (/^https?:\/\//i.test(trimmed)) {
    if (trimmed.includes("netphim.app")) {
      return absoluteUrl(DEFAULT_OG_IMAGE_PATH);
    }
    return trimmed;
  }

  return absoluteUrl(trimmed);
}

export interface BuildSeoParams {
  title: string;
  description: string;
  path?: string;
  imageUrl?: string | null;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  type?: "website" | "video.movie" | "video.episode" | "video.other" | "profile";
  keywords?: string[];
  noIndex?: boolean;
}

/**
 * Generates uniform, production-tested SEO Metadata for Next.js App Router pages.
 */
export function buildSeoMetadata({
  title,
  description,
  path = "",
  imageUrl,
  imageAlt,
  imageWidth = 1200,
  imageHeight = 630,
  type = "website",
  keywords,
  noIndex = false,
}: BuildSeoParams): Metadata {
  const canonicalUrl = absoluteUrl(path);
  const resolvedImage = resolveOgImageUrl(imageUrl);
  const altText = imageAlt || title;

  return {
    metadataBase: new URL(getSiteUrl()),
    title,
    description,
    keywords: keywords && keywords.length > 0 ? keywords : undefined,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "FlexPhim",
      locale: "vi_VN",
      type,
      images: [
        {
          url: resolvedImage,
          width: imageWidth,
          height: imageHeight,
          alt: altText,
          type: resolvedImage.endsWith(".png") ? "image/png" : "image/jpeg",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [resolvedImage],
    },
  };
}
