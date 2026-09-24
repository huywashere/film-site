import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 60;

const DEFAULT_PUBLIC_CONFIGURATION = {
  maintenanceMode: false,
  maintenanceNotice: "",
  announcementText: "",
  announcementLink: "",
  homePopupEnabled: false,
  homePopupTitle: "",
  homePopupBody: "",
  homePopupLink: "",
  homePopupLinkLabel: "",
  homePopupDismissLabel: "",
  homePopupVersion: 0,
  heroMovieSlugs: [],
  providerPriority: [],
  autoSkipIntro: false,
  watchPartyEnabled: true,
  homeTop10Slugs: [],
  homeSectionOrder: [],
  homeHiddenSections: [],
  homeFeaturedRows: {},
  cacheVersion: 1,
  updatedAt: null,
};

function upstreamUrl(): string | null {
  const configured = (
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(configured)) return null;
  const base = configured.endsWith("/api") ? `${configured}/v1` : configured;
  return `${base}/config/public`;
}

function responseHeaders(available: boolean): HeadersInit {
  return {
    "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
    "X-NetPhim-Config-Available": available ? "1" : "0",
  };
}

export async function GET() {
  const url = upstreamUrl();
  if (url) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(1_500),
        next: { revalidate: 60, tags: ["public-site-configuration"] },
      });
      if (response.ok) {
        return NextResponse.json(await response.json(), {
          headers: responseHeaders(true),
        });
      }
    } catch {
      // Public configuration is optional. The explicit defaults keep the site
      // usable while the API wakes up without producing a browser-visible 5xx.
    }
  }

  return NextResponse.json(DEFAULT_PUBLIC_CONFIGURATION, {
    headers: responseHeaders(false),
  });
}
