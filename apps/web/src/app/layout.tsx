import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ConditionalNavbar } from "@/components/layout/ConditionalNavbar";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";
import { QueryProvider } from "@/providers/QueryProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { RegisterSW } from "@/components/layout/RegisterSW";
import { ThemeWatcher } from "@/components/layout/ThemeWatcher";
import { ScrollProvider } from "@/providers/ScrollProvider";
import { OfflineDetector } from "@/components/layout/OfflineDetector";
import { AuthModal } from "@/components/auth/AuthModal";

export const viewport: Viewport = {
  themeColor: "#14181c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
    statusBarStyle: "default",
  },
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
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <ThemeWatcher />
        <RegisterSW />
        <QueryProvider>
          <ToastProvider>
            <OfflineDetector />
            <AuthModal />
            <ScrollProvider>
              <ConditionalNavbar />
              <main className="page-content pb-16 lg:pb-0">{children}</main>
              <MobileBottomNav />
              <ScrollToTopButton />
              <ConditionalFooter />
            </ScrollProvider>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
