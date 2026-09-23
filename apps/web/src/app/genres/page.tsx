'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { cardFont } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import { buildAsianHeroImageCandidates } from '@/lib/curated-asian-hero';
import { movieApi } from '@/lib/api';

interface HubCard {
  slug: string;
  title: string;
  href: string;
  image: string;
  showFullBanner?: boolean;
}

const HUBS: HubCard[] = [
  {
    slug: 'phim-han-quoc',
    title: 'Phim Hàn Quốc',
    href: '/country/han-quoc',
    image: 'https://image.tmdb.org/t/p/w1280/wcP3FsRLog4GNEs9PFrDKKQdcof.jpg',
    showFullBanner: true,
  },
  {
    slug: 'phim-trung-quoc',
    title: 'Phim Trung Quốc',
    href: '/country/trung-quoc',
    image: 'https://image.tmdb.org/t/p/w1280/5fhS6Bh4VnF0SOZyZnhNpc0XHDb.jpg',
    showFullBanner: true,
  },
  {
    slug: 'anime-hoat-hinh',
    title: 'Anime & Hoạt Hình',
    href: '/films/anime',
    image: 'https://image.tmdb.org/t/p/w1280/3GQKYh6Trm8pxd2AypovoYQf4Ay.jpg',
  },
  {
    slug: 'doraemon',
    title: 'Doraemon Movie',
    href: '/universe/doraemon',
    image: 'https://image.tmdb.org/t/p/w1280/Z3mSxuPRNiFYxf1LBoGz3YrJzC.jpg',
  },
  {
    slug: 'conan',
    title: 'Thám Tử Lừng Danh Conan',
    href: '/universe/conan',
    image: 'https://image.tmdb.org/t/p/w1280/4TMkOnI6rCYxqD059aeeQSBv5mc.jpg',
  },
  {
    slug: 'khoa-hoc-vien-tuong',
    title: 'Khoa Học Viễn Tưởng',
    href: '/genre/vien-tuong',
    image: 'https://image.tmdb.org/t/p/w1280/eZ239CUp1d6OryZEBPnO2n87gMG.jpg',
  },
  {
    slug: 'chien-tranh',
    title: 'Chiến Tranh & Lịch Sử',
    href: '/genre/chien-tranh',
    image: 'https://image.tmdb.org/t/p/w1280/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg',
  },
  {
    slug: 'thuyet-minh-song-ngu-ai',
    title: 'Thuyết Minh Song Ngữ AI',
    href: '/films/thuyet-minh-ai',
    image: 'https://image.tmdb.org/t/p/w1280/gNdLJU9TxrpGx4dkZidjys3fyy0.jpg',
  },
  {
    slug: 'marvel',
    title: 'Vũ Trụ Marvel',
    href: '/universe/marvel',
    image: 'https://image.tmdb.org/t/p/w1280/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg',
  },
  {
    slug: 'dc',
    title: 'Vũ Trụ DC',
    href: '/universe/dc',
    image: 'https://image.tmdb.org/t/p/w1280/dqK9Hag1054tghRQSqLSfrkvQnA.jpg',
  },
];

function ResilientHubCardImage({
  src,
  isPriority,
  showFullBanner = false,
}: {
  src: string;
  isPriority?: boolean;
  showFullBanner?: boolean;
}) {
  const candidates = useMemo(() => {
    if (src.includes('image.tmdb.org')) {
      return [
        src,
        `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=640&q=80&output=webp&we=1`,
        `/api/image-proxy?url=${encodeURIComponent(src)}&strict=1`,
      ];
    }
    return buildAsianHeroImageCandidates(src);
  }, [src]);

  const [candidateIdx, setCandidateIdx] = useState(0);

  useEffect(() => {
    setCandidateIdx(0);
  }, [src]);

  const currentSrc = candidates[candidateIdx] || src;

  return (
    <Image
      key={currentSrc}
      src={currentSrc}
      alt=""
      aria-hidden="true"
      fill
      unoptimized
      sizes="(max-width: 639px) calc(100vw - 28px), (max-width: 1279px) 50vw, 25vw"
      loading={isPriority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={isPriority ? 'high' : 'auto'}
      referrerPolicy="no-referrer"
      onError={() => {
        if (candidateIdx < candidates.length - 1) {
          setCandidateIdx((prev: number) => prev + 1);
        }
      }}
      className={cn(
        'brightness-[0.92] saturate-[1.04] transition-[transform,filter] duration-500 ease-out group-hover:brightness-100',
        showFullBanner
          ? 'object-contain object-top group-hover:scale-[1.012]'
          : 'object-cover object-center group-hover:scale-[1.025]',
      )}
    />
  );
}

export default function GenresPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const handlePrefetchHub = useCallback(
    (hub: HubCard) => {
      router.prefetch(hub.href);
      if (hub.slug === 'marvel') {
        void queryClient.prefetchQuery({
          queryKey: ['films-universe', 'marvel', 1],
          queryFn: async () => {
            const { getUniverseFilms } = await import('@/lib/universe-catalog');
            return getUniverseFilms('marvel');
          },
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === 'dc') {
        void queryClient.prefetchQuery({
          queryKey: ['films-universe', 'dc', 1],
          queryFn: async () => {
            const { getUniverseFilms } = await import('@/lib/universe-catalog');
            return getUniverseFilms('dc');
          },
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === 'doraemon') {
        void queryClient.prefetchQuery({
          queryKey: ['films-universe', 'doraemon', 1],
          queryFn: async () => {
            const { getUniverseFilms } = await import('@/lib/universe-catalog');
            return getUniverseFilms('doraemon');
          },
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === 'conan') {
        void queryClient.prefetchQuery({
          queryKey: ['films-universe', 'conan', 1],
          queryFn: async () => {
            const { getUniverseFilms } = await import('@/lib/universe-catalog');
            return getUniverseFilms('conan');
          },
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === 'khoa-hoc-vien-tuong') {
        void queryClient.prefetchQuery({
          queryKey: ['genre', 'vien-tuong', 1],
          queryFn: () => movieApi.getByGenre('vien-tuong', 1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === 'chien-tranh') {
        void queryClient.prefetchQuery({
          queryKey: ['genre', 'chien-tranh', 1],
          queryFn: () => movieApi.getByGenre('chien-tranh', 1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === 'anime-hoat-hinh') {
        void queryClient.prefetchQuery({
          queryKey: ['films-type', 'anime', 1],
          queryFn: () => movieApi.getByCountryFast('nhat-ban', 1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === 'phim-han-quoc') {
        void queryClient.prefetchQuery({
          queryKey: ['country-fast', 'han-quoc', 1, ''],
          queryFn: () => movieApi.getByCountryFast('han-quoc', 1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === 'phim-trung-quoc') {
        void queryClient.prefetchQuery({
          queryKey: ['country-fast', 'trung-quoc', 1, ''],
          queryFn: () => movieApi.getByCountryFast('trung-quoc', 1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === 'thuyet-minh-song-ngu-ai') {
        void queryClient.prefetchQuery({
          queryKey: ['films-type', 'thuyet-minh-ai', 1],
          queryFn: () => movieApi.getThuyetMinh(1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      }
    },
    [queryClient, router],
  );

  // Background idle prefetch for top hubs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      void queryClient.prefetchQuery({
        queryKey: ['country-fast', 'han-quoc', 1, ''],
        queryFn: () => movieApi.getByCountryFast('han-quoc', 1).then((r) => r.data),
        staleTime: 30 * 60 * 1000,
      });
      void queryClient.prefetchQuery({
        queryKey: ['country-fast', 'trung-quoc', 1, ''],
        queryFn: () => movieApi.getByCountryFast('trung-quoc', 1).then((r) => r.data),
        staleTime: 30 * 60 * 1000,
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [queryClient]);

  return (
    <main
      className={cn(
        cardFont.className,
        'relative min-h-[100dvh] bg-[#0a0b10] text-white pb-24 sm:pb-28 pt-16 sm:pt-20',
      )}
    >
      <div className="relative z-10 mx-auto w-full max-w-[1720px] px-3.5 sm:px-6 md:pl-20 md:pr-6 lg:pl-24 lg:pr-10 xl:pl-28 xl:pr-12 space-y-8 sm:space-y-10">
        <section aria-label="Danh sách chủ đề điện ảnh" className="space-y-4">
          <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl lg:text-3xl">
            Chủ Đề
          </h1>

          {/* Image-first cinematic grid: 2 columns on mobile, 2 on tablet, 4 on desktop */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            {HUBS.map((hub, idx) => {
              return (
                <Link
                  key={hub.slug}
                  href={hub.href}
                  prefetch={true}
                  onMouseEnter={() => handlePrefetchHub(hub)}
                  onFocus={() => handlePrefetchHub(hub)}
                  onTouchStart={() => handlePrefetchHub(hub)}
                  onPointerDown={() => handlePrefetchHub(hub)}
                  className="group relative isolate aspect-[4/3] sm:aspect-[16/10] min-h-[170px] sm:min-h-[210px] cursor-pointer select-none overflow-hidden rounded-xl sm:rounded-2xl border border-white/[0.10] bg-[#0e1017] shadow-[0_16px_42px_rgba(0,0,0,0.20)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:shadow-[0_20px_52px_rgba(0,0,0,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090d]"
                >
                  {/* Artwork with rich contrast protection */}
                  <div
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                    aria-hidden="true"
                  >
                    <ResilientHubCardImage
                      src={hub.image}
                      isPriority={idx < 4}
                      showFullBanner={hub.showFullBanner}
                    />
                    {/* Overall dark tint so bright artwork doesn't overpower text */}
                    <div
                      className={cn(
                        'absolute inset-0 transition-opacity duration-300',
                        hub.showFullBanner
                          ? 'bg-black/15 group-hover:bg-black/10'
                          : 'bg-black/35 group-hover:bg-black/25',
                      )}
                    />
                    <div
                      className={cn(
                        'absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07080d] via-[#07080d]/95 via-50% to-transparent',
                        hub.showFullBanner ? 'h-[45%]' : 'h-[55%]',
                      )}
                    />
                  </div>

                  <div className="absolute inset-x-0 bottom-0 z-10 p-3 sm:p-4 sm:p-[18px]">
                    <h3 className="line-clamp-1 text-xs sm:text-base lg:text-[17px] font-black leading-tight tracking-[-0.02em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                      {hub.title}
                    </h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
