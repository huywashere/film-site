import "./globals.css";
import "./light-theme.css";
import type { Metadata, Viewport } from "next";
import {
  Be_Vietnam_Pro,
  Manrope,
  Roboto_Condensed,
} from "next/font/google";
import { ConditionalNavbar } from "@/components/layout/ConditionalNavbar";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";
import { Sidebar } from "@/components/layout/Sidebar";
import { QueryProvider } from "@/providers/QueryProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { RegisterSW } from "@/components/layout/RegisterSW";
import { ThemeWatcher } from "@/components/layout/ThemeWatcher";
import { ThemeColorSync } from "@/components/layout/ThemeColorSync";
import { ScrollProvider } from "@/providers/ScrollProvider";
import { OfflineDetector } from "@/components/layout/OfflineDetector";
import { ClientTelemetry } from "@/components/layout/ClientTelemetry";
import { AuthSessionBridge } from "@/components/auth/AuthSessionBridge";
import { LazyAuthModalHost } from "@/components/auth/LazyAuthModalHost";
import { AntiDevTools } from "@/components/security/AntiDevTools";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ScrollToTopButton } from "@/components/layout/ScrollToTop";

export const viewport: Viewport = {
  themeColor: "#141414",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://film-site-web.vercel.app",
  ),
  title: {
    default: "NetPhim — Xem Phim Online Miễn Phí Full HD 4K",
    template: "%s | NetPhim",
  },
  description:
    "Nền tảng xem phim online chất lượng cao 4K. Phim bộ, phim lẻ, anime, TV Shows với phụ đề tiếng Việt và thuyết minh cập nhật liên tục.",
  keywords: [
    "xem phim",
    "phim online",
    "phim bộ",
    "phim lẻ",
    "hoạt hình",
    "anime vietsub",
    "phim thuyết minh",
    "NetPhim",
  ],
  icons: {
    icon: "/cinephim-logo.png",
    shortcut: "/cinephim-logo.png",
    apple: "/cinephim-logo.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "NetPhim",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: "NetPhim — Xem Phim Online Miễn Phí Full HD 4K",
    description:
      "Nền tảng xem phim online chất lượng cao 4K. Phim bộ, phim lẻ, anime với phụ đề tiếng Việt và thuyết minh.",
    url: "https://film-site-web.vercel.app",
    siteName: "NetPhim",
    locale: "vi_VN",
    type: "website",
    images: [
      {
        url: "/cinephim-logo.png",
        width: 1200,
        height: 630,
        alt: "NetPhim — Xem Phim Online",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NetPhim — Xem Phim Online Miễn Phí Full HD 4K",
    description:
      "Nền tảng xem phim online chất lượng cao 4K với hàng ngàn bộ phim bom tấn mới nhất.",
    images: ["/cinephim-logo.png"],
  },
};

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-be-vietnam",
  preload: true,
});

const manrope = Manrope({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-manrope",
  preload: true,
});

const robotoCondensed = Roboto_Condensed({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-cinema",
  preload: true,
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "NetPhim",
    alternateName: "NetPhim Xem Phim Online 4K",
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
        <meta name="referrer" content="no-referrer" />
        <link rel="icon" href="/cinephim-logo.png" type="image/png" />
        <link rel="shortcut icon" href="/cinephim-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/cinephim-logo.png" />
        <link rel="preconnect" href="https://wsrv.nl" />
        <link rel="dns-prefetch" href="https://wsrv.nl" />
        <link rel="preconnect" href="https://img.phimapi.com" />
        <link rel="dns-prefetch" href="https://img.phimapi.com" />
        <link rel="preconnect" href="https://phimimg.com" />
        <link rel="dns-prefetch" href="https://phimimg.com" />
        <link rel="preconnect" href="https://img.ophim.live" />
        <link rel="dns-prefetch" href="https://img.ophim.live" />
        <link rel="preconnect" href="https://images.nguonc.com" />
        <link rel="dns-prefetch" href="https://images.nguonc.com" />
        <link rel="preconnect" href="https://image.tmdb.org" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteSchema) }}
        />
      </head>
      <body
        className={`${beVietnamPro.variable} ${manrope.variable} ${robotoCondensed.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ThemeWatcher />
        <ThemeColorSync />
        <RegisterSW />
        <AntiDevTools />
        <ClientTelemetry />
        <QueryProvider>
          <ToastProvider>
            <AuthSessionBridge />
            <LazyAuthModalHost />
            <OfflineDetector />
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
              <div data-site-chrome>
                <ScrollToTopButton />
              </div>
            </ScrollProvider>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
