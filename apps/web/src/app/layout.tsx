import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ConditionalNavbar } from "@/components/layout/ConditionalNavbar";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";
import { Sidebar } from "@/components/layout/Sidebar";
import { QueryProvider } from "@/providers/QueryProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { RegisterSW } from "@/components/layout/RegisterSW";
import { ThemeWatcher } from "@/components/layout/ThemeWatcher";
import { ScrollProvider } from "@/providers/ScrollProvider";
import { OfflineDetector } from "@/components/layout/OfflineDetector";
import { GuestDataMergePrompt } from "@/components/auth/GuestDataMergePrompt";
import { ClientTelemetry } from "@/components/layout/ClientTelemetry";
import { AuthSessionBridge } from "@/components/auth/AuthSessionBridge";

export const viewport: Viewport = {
  themeColor: "#08090c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "CineVerse — Xem Phim Online",
    template: "%s | CineVerse",
  },
  description:
    "Nền tảng xem phim online chất lượng cao. Phim bộ, phim lẻ, hoạt hình, TV Shows với phụ đề tiếng Việt.",
  keywords: [
    "xem phim",
    "phim online",
    "phim bộ",
    "phim lẻ",
    "hoạt hình",
    "CineVerse",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "CineVerse",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: "CineVerse — Xem Phim Online",
    description: "Nền tảng xem phim online chất lượng cao",
    type: "website",
  },
};

import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ScrollToTopButton } from "@/components/layout/ScrollToTop";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Be Vietnam Pro — font chính, hỗ trợ tiếng Việt hoàn hảo */}
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500&family=Inter:wght@300;400;500;600;700;800&family=Manrope:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body suppressHydrationWarning>
        <ThemeWatcher />
        <RegisterSW />
        <ClientTelemetry />
        <QueryProvider>
          <ToastProvider>
            <AuthSessionBridge />
            <OfflineDetector />
            <GuestDataMergePrompt />
            <ScrollProvider>
              <div data-site-chrome>
                <ConditionalNavbar />
              </div>
              <div data-site-chrome>
                <Sidebar />
              </div>
              <main className="page-content pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
                {children}
              </main>
              <div data-site-chrome>
                <MobileBottomNav />
              </div>
              <div data-site-chrome>
                <ScrollToTopButton />
              </div>
              <div data-site-chrome>
                <ConditionalFooter />
              </div>
            </ScrollProvider>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
