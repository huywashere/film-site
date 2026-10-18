import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

const KKPHIM_BASE = process.env.KKPHIM_API_BASE || "https://phimapi.com";
const SITE_URL = getSiteUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static & Category pages
  const staticRoutes = [
    "",
    "/login",
    "/register",
    "/watchlist",
    "/search",
    "/films/series",
    "/films/single",
    "/films/anime",
    "/genre/hanh-dong",
    "/genre/kinh-di",
    "/genre/tinh-cam",
    "/genre/hai-huoc",
    "/genre/vien-tuong",
    "/country/han-quoc",
    "/country/trung-quoc",
    "/country/au-my",
  ];

  const routes = staticRoutes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  try {
    // Dynamic pages (latest movies fetched directly server-side)
    const res = await fetch(
      `${KKPHIM_BASE}/danh-sach/phim-moi-cap-nhat?page=1`,
      {
        next: { revalidate: 3600 },
      },
    );
    const data = await res.json();
    const films = data?.items || [];

    const filmRoutes = films.map((film: any) => {
      let lastModified = new Date();
      if (film.modified) {
        const parsed = new Date(film.modified);
        if (!isNaN(parsed.getTime())) {
          lastModified = parsed;
        }
      }
      return {
        url: `${SITE_URL}/film/${film.slug}`,
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      };
    });

    return [...routes, ...filmRoutes];
  } catch (err) {
    console.error("Sitemap generation failed:", err);
    return routes;
  }
}
