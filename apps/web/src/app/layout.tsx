import "./globals.css";
import "./light-theme.css";
import type { Metadata, Viewport } from "next";
import { ConditionalNavbar } from "@/components/layout/ConditionalNavbar";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";
import { Sidebar } from "@/components/layout/Sidebar";
import { QueryProvider } from "@/providers/QueryProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { ThemeWatcher } from "@/components/layout/ThemeWatcher";
import { ThemeColorSync } from "@/components/layout/ThemeColorSync";
import { ScrollProvider } from "@/providers/ScrollProvider";
import { AuthSessionBridge } from "@/components/auth/AuthSessionBridge";
import { LazyAuthModalHost } from "@/components/auth/LazyAuthModalHost";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ClientBackgroundServices } from "@/components/layout/ClientBackgroundServices";
import { OperationalNotice } from "@/components/layout/OperationalNotice";
import { MaintenanceGuard } from "@/components/layout/MaintenanceGuard";
import { LogoSplashIntro } from "@/components/layout/LogoSplashIntro";
import { TopRouteProgress } from "@/components/layout/TopRouteProgress";
import { cardFont, logoFont } from "@/lib/fonts";

const PREPAINT_SCRIPT = `
(() => {
  const root = document.documentElement;

  try {
    const splashKey = "flexphim-entry-splash-v1";
    const hasSeenSplash = sessionStorage.getItem(splashKey) === "1";
    root.dataset.entrySplash = hasSeenSplash ? "skip" : "show";
    if (!hasSeenSplash) sessionStorage.setItem(splashKey, "1");
  } catch {
    root.dataset.entrySplash = "show";
  }

  try {
    const persisted = JSON.parse(localStorage.getItem("netphim-theme") || "null");
    const state = persisted && persisted.state ? persisted.state : {};
    const theme = state.theme === "light" ? "light" : "dark";
    const pureBlack = theme === "dark" && state.pureBlack === true;

    root.dataset.theme = theme;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("pure-black", pureBlack);
    if (pureBlack) root.dataset.pureBlack = "true";
    else delete root.dataset.pureBlack;
  } catch {
    root.dataset.theme = "dark";
    root.classList.add("dark");
  }
})();`;

export const viewport: Viewport = {
  themeColor: "#141414",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://netphim.app",
  ),
  title: {
    default: "FlexPhim — Xem Phim Online",
    template: "%s | FlexPhim",
  },
  description:
    "Nền tảng xem phim online chất lượng cao. Phim bộ, phim lẻ, anime, TV Shows với phụ đề tiếng Việt và thuyết minh cập nhật liên tục.",
  keywords: [
    "xem phim",
    "phim online",
    "phim bộ",
    "phim lẻ",
    "hoạt hình",
    "anime vietsub",
    "phim thuyết minh",
    "FlexPhim",
  ],
  icons: {
    icon: [
      { url: "/flexphim-logo.svg", type: "image/svg+xml" },
      { url: "/flexphim-logo.png", type: "image/png" },
    ],
    shortcut: "/flexphim-logo.svg",
    apple: "/flexphim-logo.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "FlexPhim — Xem Phim Online",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: "FlexPhim — Xem Phim Online",
    description:
      "Nền tảng xem phim online chất lượng cao. Phim bộ, phim lẻ, anime với phụ đề tiếng Việt và thuyết minh.",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://netphim.app",
    siteName: "FlexPhim",
    locale: "vi_VN",
    type: "website",
    images: [
      {
        url: "/flexphim-logo.png",
        width: 1200,
        height: 630,
        alt: "FlexPhim — Xem Phim Online",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FlexPhim — Xem Phim Online",
    description:
      "Nền tảng xem phim online chất lượng cao với hàng ngàn bộ phim bom tấn mới nhất.",
    images: ["/flexphim-logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "FlexPhim",
    alternateName: "FlexPhim Xem Phim Online",
    url: "https://netphim.app",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://netphim.app/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREPAINT_SCRIPT }} />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <link rel="icon" href="/flexphim-logo.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/flexphim-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/flexphim-logo.png" />
        <link rel="dns-prefetch" href="https://wsrv.nl" />
        <link rel="dns-prefetch" href="https://img.phimapi.com" />
        <link rel="preconnect" href="https://phimimg.com" />
        <link rel="dns-prefetch" href="https://phimimg.com" />
        <link rel="dns-prefetch" href="https://img.ophim.live" />
        <link rel="dns-prefetch" href="https://images.nguonc.com" />
        <link rel="preconnect" href="https://image.tmdb.org" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
        <link
          rel="preload"
          as="image"
          href="/images/splash/poster-grid-mobile.webp"
          type="image/webp"
          media="(max-width: 639px)"
          fetchPriority="high"
        />
        <link
          rel="preload"
          as="image"
          href="/images/splash/poster-grid-desktop.webp"
          type="image/webp"
          media="(min-width: 640px)"
          fetchPriority="high"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteSchema) }}
        />
      </head>
      <body
        className={`${cardFont.variable} ${logoFont.variable} ${cardFont.className} antialiased`}
        suppressHydrationWarning
      >
        <TopRouteProgress />
        <LogoSplashIntro />
        <ThemeWatcher />
        <ThemeColorSync />
        <OperationalNotice />
        <QueryProvider>
          <MaintenanceGuard />
          <ToastProvider>
            <AuthSessionBridge />
            <LazyAuthModalHost />
            <ScrollProvider>
              <div data-site-chrome>
                <ConditionalNavbar />
              </div>
              <div data-site-chrome>
                <Sidebar />
              </div>
              <main className="page-content min-h-screen">
                {children}
                <div data-site-chrome>
                  <ConditionalFooter />
                </div>
              </main>
              <div data-site-chrome>
                <MobileBottomNav />
              </div>
              <ClientBackgroundServices />
            </ScrollProvider>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
