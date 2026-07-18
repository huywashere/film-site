import 'core-js/stable';
import 'regenerator-runtime/runtime';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { QueryProvider } from '@/providers/QueryProvider';
import { ToastProvider } from '@/providers/ToastProvider';
import { RegisterSW } from '@/components/layout/RegisterSW';
import { ThemeWatcher } from '@/components/layout/ThemeWatcher';
import { ScrollProvider } from '@/providers/ScrollProvider';

export const viewport: Viewport = {
  themeColor: '#00c030',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: 'CineVerse — Xem Phim Online',
    template: '%s | CineVerse',
  },
  description: 'Nền tảng xem phim online chất lượng cao. Phim bộ, phim lẻ, hoạt hình, TV Shows với phụ đề tiếng Việt.',
  keywords: ['xem phim', 'phim online', 'phim bộ', 'phim lẻ', 'hoạt hình', 'CineVerse'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'CineVerse',
    statusBarStyle: 'default',
  },
  openGraph: {
    title: 'CineVerse — Xem Phim Online',
    description: 'Nền tảng xem phim online chất lượng cao',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <ThemeWatcher />
        <RegisterSW />
        <QueryProvider>
          <ToastProvider>
            <ScrollProvider>
              <Navbar />
              <main className="page-content">
                {children}
              </main>
              <Footer />
            </ScrollProvider>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
