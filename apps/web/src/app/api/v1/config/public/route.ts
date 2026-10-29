import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

function readLocalDevConfig(): any | null {
  try {
    const candidates = [
      path.resolve(process.cwd(), ".local-data/dev-site-config.json"),
      path.resolve(process.cwd(), "../../.local-data/dev-site-config.json"),
      path.resolve(process.cwd(), "../.local-data/dev-site-config.json"),
    ];
    for (const file of candidates) {
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.heroMovieSlugs)) {
          return {
            ...DEFAULT_PUBLIC_CONFIGURATION,
            ...parsed,
          };
        }
      }
    }
  } catch {}
  return null;
}

export async function GET() {
  const localDev = readLocalDevConfig();

  const url = upstreamUrl();
  if (url) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(1_500),
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.heroMovieSlugs) && data.heroMovieSlugs.length > 0) {
          return NextResponse.json(data, {
            headers: responseHeaders(true),
          });
        }
        if (localDev?.heroMovieSlugs?.length > 0) {
          return NextResponse.json(
            {
              ...data,
              heroMovieSlugs: localDev.heroMovieSlugs,
            },
            {
              headers: responseHeaders(true),
            },
          );
        }
        return NextResponse.json(data, {
          headers: responseHeaders(true),
        });
      }
    } catch {
      // Public configuration is optional. The explicit defaults keep the site
      // usable while the API wakes up without producing a browser-visible 5xx.
    }
  }

  if (localDev) {
    return NextResponse.json(localDev, {
      headers: responseHeaders(true),
    });
  }

  return NextResponse.json(DEFAULT_PUBLIC_CONFIGURATION, {
    headers: responseHeaders(false),
  });
}
