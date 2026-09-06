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
import { LogoSplashIntro } from "@/components/layout/LogoSplashIntro";
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=document.documentElement;r.dataset.netphimIntro="show";var a=["8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg","ji3ecJphATlVgWNY0B0RVXZizdf.jpg","kW9LmvYHAaS9iA0tHmZVq8hQYoq.jpg","8j58iEBw9pOXFD2L0nt0ZXeHviB.jpg","mbm8k3GFhXS0ROd9AD1gqYbIFbM.jpg","nT97ifVT2J1yMQmeq20Qblg61T.jpg","umSVjVdbVwtx5ryCA2QXL44Durm.jpg","iQ5ztdjvteGeboxtmRdXEChJOHh.jpg","9OkCLM73MIU2CrKZbqiT8Ln1wY2.jpg","3bhkrj58Vtu7enYsRolD1fZdja1.jpg","sSuQTCZwqKrNBNIsksO9IAUoWP9.jpg","sX9idXDqRUxE5ffww3n3RV5gL55.jpg","lz8vNyXeidqqOdJW9ZjnDAMb5Vr.jpg","uhviyknTT5cEQXbn6vWIqfM4vGm.jpg","ts996lKsxvjkO2yiYG0ht4qAicO.jpg","nrmXQ0zcZUL8jFLrakWc90IR8z9.jpg","gEU2QniE6E77NI6lCU6MxlNBvIx.jpg","oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg","qJ2tW6WMUDux911r6m7haRef0WH.jpg","or06FN3Dka5tukK1e9sl16pB3iy.jpg","8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg","czembW0Rk1Ke7lCJGzyAi8Fscgt.jpg","7IiTTgloJzvGI1TAYymCfbfl3vT.jpg","q719jXXEzOoYaps6qFsVoMe0qtn.jpg","39wmItIWsg5sZMyRUHLkWBcuVCM.jpg","vIeu8WysZrTS7vxbtipRMQ0SSap.jpg","h8Rb9gBr48ODIwYUtZv5C9W0xRi.jpg","fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg","hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg","7jswQA9409iA9j5v079m19vN4mH.jpg","62HCnUTziyWcpDaBO2i1DX17ljH.jpg","muAuXW31r18aN5fX5zY8bF1BqN8.jpg","vZloFAK7NmvMGKE7VkF5UHaz0I.jpg","ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg","f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg","pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg"];for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t}for(var k=0;k<18;k++){var u="https://wsrv.nl/?url="+encodeURIComponent("https://image.tmdb.org/t/p/w300/"+a[k])+"&w=300&q=75&output=webp";r.style.setProperty("--netphim-intro-poster-"+(k+1),'url("'+u+'")')}}catch(e){document.documentElement.dataset.netphimIntro="show";}})();`,
          }}
        />
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
        <LogoSplashIntro />
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
