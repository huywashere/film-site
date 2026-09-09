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
import { cardFont } from "@/lib/fonts";

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
    default: "NetPhim — Xem Phim Online",
    template: "%s | NetPhim",
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
    "NetPhim",
  ],
  icons: {
    icon: [
      { url: "/cinephim-logo.svg", type: "image/svg+xml" },
      { url: "/cinephim-logo.png", type: "image/png" },
    ],
    shortcut: "/cinephim-logo.svg",
    apple: "/cinephim-logo.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "NetPhim — Xem Phim Online",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: "NetPhim — Xem Phim Online",
    description:
      "Nền tảng xem phim online chất lượng cao. Phim bộ, phim lẻ, anime với phụ đề tiếng Việt và thuyết minh.",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://netphim.app",
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
    title: "NetPhim — Xem Phim Online",
    description:
      "Nền tảng xem phim online chất lượng cao với hàng ngàn bộ phim bom tấn mới nhất.",
    images: ["/cinephim-logo.png"],
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
    name: "NetPhim",
    alternateName: "NetPhim Xem Phim Online",
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
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <link rel="icon" href="/cinephim-logo.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/cinephim-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/cinephim-logo.png" />
        <link rel="dns-prefetch" href="https://wsrv.nl" />
        <link rel="dns-prefetch" href="https://img.phimapi.com" />
        <link rel="preconnect" href="https://phimimg.com" />
        <link rel="dns-prefetch" href="https://phimimg.com" />
        <link rel="dns-prefetch" href="https://img.ophim.live" />
        <link rel="dns-prefetch" href="https://images.nguonc.com" />
        <link rel="preconnect" href="https://image.tmdb.org" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteSchema) }}
        />
      </head>
      <body
        className={`${cardFont.variable} ${cardFont.className} antialiased`}
        suppressHydrationWarning
      >
        <ThemeWatcher />
        <ThemeColorSync />
        <OperationalNotice />
        <QueryProvider>
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
