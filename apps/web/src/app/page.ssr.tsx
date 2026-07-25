import { Suspense } from "react";
import { HeroBannerServer } from "./components/HeroBannerServer";
import {
  FilmSectionsWrapper,
  TopicBannersWrapper,
} from "./components/homepage-sections";
import { ContinueWatchingRow } from "@/components/film/ContinueWatchingRow";
import { SmartRecommendationSection } from "@/components/film/SmartRecommendationSection";
import { KeyboardSearchBanner } from "./components/KeyboardSearchBanner";

// Loading skeletons
function HeroSkeleton() {
  return (
    <div className="w-full h-[calc(100vh+100px)] min-h-[700px] bg-gradient-to-br from-neutral-950 via-[#10141a] to-neutral-900 animate-pulse" />
  );
}

function SectionSkeleton() {
  return (
    <div className="mb-10 md:mb-14 animate-pulse">
      <div className="h-8 w-48 bg-white/10 rounded mb-4" />
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="w-[200px] h-[300px] bg-white/5 rounded-2xl flex-shrink-0"
          />
        ))}
      </div>
    </div>
  );
}

// ── SSR Home Page với Server Components ───────────────────────
export default function HomePage() {
  return (
    <div className="bg-background min-h-screen text-foreground overflow-hidden pb-12 -mt-[100px]">
      {/* Hero Banner - Server Component với ISR */}
      <Suspense fallback={<HeroSkeleton />}>
        <HeroBannerServer />
      </Suspense>

      {/* Main Content */}
      <div className="w-full max-w-[1680px] mx-auto px-4 md:px-12 relative pt-6 md:pt-10 z-30">
        {/* Continue Watching - Load after hero */}
        <Suspense fallback={null}>
          <ContinueWatchingRow />
        </Suspense>

        {/* AI Recommendations - Load after continue watching */}
        <Suspense fallback={null}>
          <SmartRecommendationSection />
        </Suspense>

        {/* Topic Banners - Static, no suspense needed */}
        <TopicBannersWrapper />

        {/* Film Sections - Lazy load with suspense */}
        <Suspense fallback={<SectionSkeleton />}>
          <FilmSectionsWrapper />
        </Suspense>
      </div>

      {/* Keyboard Search Banner */}
      <KeyboardSearchBanner />
    </div>
  );
}

// ── ISR Configuration ──────────────────────────────────────────
export const revalidate = 300; // Revalidate every 5 minutes
export const dynamic = "force-static"; // Static with ISR
