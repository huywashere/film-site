"use client";

import { useQuery } from "@tanstack/react-query";
import { movieApi } from "@/lib/api";
import { useState, useEffect, useMemo, lazy } from "react";
import { FilmItem } from "@/components/film/FilmCard";
import dynamic from "next/dynamic";

// Optimized Hero Banner with fallback
const HeroBannerOptimized = dynamic(() => import("./HeroBannerOptimized"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[calc(100vh+100px)] min-h-[700px] bg-gradient-to-br from-neutral-950 via-[#10141a] to-neutral-900 animate-pulse" />
  ),
});

const FilmSection = dynamic(() => import("./FilmSection"), {
  ssr: false,
});

const TopicBanners = dynamic(() => import("./TopicBanners"), {
  ssr: false,
});

// Deduplication helper
const deduplicate = (films: FilmItem[]) => {
  const seen = new Set();
  return (films || []).filter((film) => {
    if (!film || !film.slug) return false;
    const isDuplicate = seen.has(film.slug);
    seen.add(film.slug);
    return !isDuplicate;
  });
};

// ── Hero Banner Wrapper với Instant Render ───────────────────
export function HeroBannerWrapper() {
  const [shuffledFilms, setShuffledFilms] = useState<FilmItem[]>([]);

  // Fetch data nhưng KHÔNG block render
  const { data: latestData } = useQuery({
    queryKey: ["latest-hero"],
    queryFn: () => movieApi.getLatest(1).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const latestFilms = useMemo(
    () => deduplicate(latestData?.items || latestData?.data?.items || []),
    [latestData],
  );

  useEffect(() => {
    if (latestFilms.length > 0) {
      const arr = [...latestFilms];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      setShuffledFilms(arr.slice(0, 6));
    }
  }, [latestFilms]);

  // Render NGAY với fallback data, update sau khi fetch xong
  return <HeroBannerOptimized films={shuffledFilms} />;
}

// ── Film Sections Wrapper ──────────────────────────────────
export function FilmSectionsWrapper() {
  // Fetch only essential sections, remove Marvel/DC/USUK searches
  const { data: latestData, isLoading: latestLoading } = useQuery({
    queryKey: ["latest-v2", 1],
    queryFn: () => movieApi.getLatest(1).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: seriesData, isLoading: seriesLoading } = useQuery({
    queryKey: ["series-v2", 1],
    queryFn: () => movieApi.getSeries(1).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: singleData, isLoading: singleLoading } = useQuery({
    queryKey: ["single-v2", 1],
    queryFn: () => movieApi.getSingle(1).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: animeData, isLoading: animeLoading } = useQuery({
    queryKey: ["anime-v2", 1],
    queryFn: () => movieApi.getAnime(1).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const latestFilms = useMemo(
    () => deduplicate(latestData?.items || latestData?.data?.items || []),
    [latestData],
  );
  const seriesFilms = useMemo(
    () => deduplicate(seriesData?.data?.items || seriesData?.items || []),
    [seriesData],
  );
  const singleFilms = useMemo(
    () => deduplicate(singleData?.data?.items || singleData?.items || []),
    [singleData],
  );
  const animeFilms = useMemo(
    () => deduplicate(animeData?.data?.items || animeData?.items || []),
    [animeData],
  );

  return (
    <>
      <FilmSection
        title="Phim Mới Cập Nhật"
        icon="Clock"
        films={latestFilms}
        isLoading={latestLoading}
        href="/films"
      />
      <FilmSection
        title="Phim Bộ"
        icon="Tv"
        films={seriesFilms}
        isLoading={seriesLoading}
        href="/films/series"
      />
      <FilmSection
        title="Phim Lẻ"
        icon="Clapperboard"
        films={singleFilms}
        isLoading={singleLoading}
        href="/films/single"
      />
      <FilmSection
        title="Hoạt Hình"
        icon="TrendingUp"
        films={animeFilms}
        isLoading={animeLoading}
        href="/films/anime"
      />
    </>
  );
}

// ── Topic Banners Wrapper ──────────────────────────────────
export function TopicBannersWrapper() {
  return <TopicBanners />;
}
