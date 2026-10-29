'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { cardFont } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import { buildAsianHeroImageCandidates } from '@/lib/curated-asian-hero';
import { movieApi } from '@/lib/api';
import { VerticalTabsHeroBanner } from '@/components/layout/VerticalTabsHeroBanner';

interface HubCard {
  slug: string;
  title: string;
  href: string;
  image: string;
  objectPosition?: string;
}

const CDN_BASE = process.env.NEXT_PUBLIC_CDN_ASSETS_URL?.replace(/\/$/, '') || '';

export const HUBS: HubCard[] = [
  // ── 9 Chủ đề gốc đã có sẵn ảnh chuẩn ──
  {
    slug: 'phim-han-quoc',
    title: 'Phim Hàn Quốc',
    href: '/country/han-quoc',
    image: '/Folder-Background/chu-de/cong so.png',
  },
  {
    slug: 'phim-trung-quoc',
    title: 'Phim Trung Quốc',
    href: '/country/trung-quoc',
    image: '/Folder-Background/China/xương chó/pjakooca_1920x1080-chohoangvaxuong-01_1920_1080.png',
  },
  {
    slug: 'anime-hoat-hinh',
    title: 'Anime & Hoạt Hình',
    href: '/films/anime',
    image: '/Folder-Background/chu-de/naruto-team-7-black-3840x2160-25019 (1).png',
  },
  {
    slug: 'doraemon',
    title: 'Doraemon Movie',
    href: '/universe/doraemon',
    image: '/Folder-Background/chu-de/thumb-1920-1401041.png',
  },
  {
    slug: 'conan',
    title: 'Thám Tử Lừng Danh Conan',
    href: '/universe/conan',
    image: '/Folder-Background/chu-de/conan.png',
  },
  {
    slug: 'khoa-hoc-vien-tuong',
    title: 'Khoa Học Viễn Tưởng',
    href: '/genre/vien-tuong',
    image: '/Folder-Background/chu-de/matrix.png',
  },
  {
    slug: 'chien-tranh',
    title: 'Chiến Tranh & Lịch Sử',
    href: '/genre/chien-tranh',
    image: '/Folder-Background/chu-de/fury.png',
    objectPosition: 'center 18%',
  },
  {
    slug: 'marvel',
    title: 'Vũ Trụ Marvel',
    href: '/universe/marvel',
    image: '/Folder-Background/chu-de/marvel.png',
  },
  {
    slug: 'dc',
    title: 'Vũ Trụ DC',
    href: '/universe/dc',
    image: '/Folder-Background/DC/dc-hub-solo-batman.webp',
    objectPosition: 'center',
  },
  // ── 7 Thể Loại Đặc Sắc Được Bổ Sung (Đang chờ ảnh từ người dùng) ──
  {
    slug: 'phim-gia-tuong',
    title: 'Phim Giả Tưởng',
    href: '/genre/gia-tuong',
    image: '/Folder-Background/dune-2/dune-hub-solo-paul.webp',
    objectPosition: 'center',
  },
  {
    slug: 'khoa-hoc-vu-tru',
    title: 'Khoa Học Vũ Trụ',
    href: '/universe/khoa-hoc-vu-tru',
    image: '/Folder-Background/starwar/starwars-hub-solo-vader.webp',
    objectPosition: 'center',
  },
  {
    slug: 'kids',
    title: 'Phim Thiếu Nhi (Kids)',
    href: '/genre/tre-em',
    image: '',
  },
  {
    slug: 'phim-hinh-su',
    title: 'Phim Hình Sự',
    href: '/genre/hinh-su',
    image: '',
  },
  {
    slug: 'phim-tai-lieu',
    title: 'Phim Tài Liệu',
    href: '/genre/tai-lieu',
    image: '',
  },
  {
    slug: 'phim-chinh-kich',
    title: 'Phim Chính Kịch',
    href: '/genre/chinh-kich',
    image: '',
  },
  {
    slug: 'phim-hai',
    title: 'Phim Hài Hước',
    href: '/genre/hai-huoc',
    image: '',
  },
];

function ResilientHubCardImage({
  src,
  isPriority,
  objectPosition = 'center',
}: {
  src: string;
  isPriority?: boolean;
  objectPosition?: string;
}) {
  const candidates = useMemo(() => {
    if (!src) return [];
    if (src.startsWith('/Folder-Background/') || src.startsWith('/img-backtop/')) {
      const encodedSrc = encodeURI(src);
      const cdnUrl = CDN_BASE ? `${CDN_BASE}${encodedSrc}` : '';
      return cdnUrl ? [encodedSrc, cdnUrl] : [encodedSrc];
    }
    if (src.includes('image.tmdb.org')) {
      return [
        `/api/image-proxy?url=${encodeURIComponent(src)}&strict=1`,
        src,
        `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=640&q=80&output=webp&we=1`,
      ];
    }
    return buildAsianHeroImageCandidates(src);
  }, [src]);

  const [candidateIdx, setCandidateIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCandidateIdx(0);
    setFailed(false);
  }, [src]);

  const currentSrc = candidates[candidateIdx] || src;

  if (failed || !currentSrc) {
    return (
      <div className="h-full w-full bg-[radial-gradient(circle_at_70%_22%,rgba(255,255,255,0.06),transparent_42%),linear-gradient(135deg,#171923,#090a10)]" />
    );
  }

  return (
    <Image
      src={currentSrc}
      alt=""
      fill
      priority={isPriority}
      loading={isPriority ? 'eager' : 'lazy'}
      decoding="async"
      unoptimized
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 18vw"
      onError={() => {
        if (candidateIdx + 1 < candidates.length) {
          setCandidateIdx((prev) => prev + 1);
        } else {
          setFailed(true);
        }
      }}
      className="object-cover transition-transform duration-500 will-change-transform group-hover:scale-105"
      style={{ objectPosition }}
    />
  );
}

function HubCardItem({
  hub,
  idx,
  onPrefetch,
}: {
  hub: HubCard;
  idx: number;
  onPrefetch: (hub: HubCard) => void;
}) {
  const hasImage = Boolean(hub.image);

  return (
    <Link
      key={hub.slug}
      href={hub.href}
      prefetch
      onMouseEnter={() => onPrefetch(hub)}
      onFocus={() => onPrefetch(hub)}
      onTouchStart={() => onPrefetch(hub)}
      onPointerDown={() => onPrefetch(hub)}
      className="group relative z-10 aspect-[16/9] cursor-pointer select-none overflow-hidden rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#0e1017] shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition-all duration-300 hover:z-30 hover:-translate-y-1.5 hover:border-white/35 hover:shadow-[0_16px_36px_rgba(0,0,0,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
    >
      {/* Artwork with rich contrast protection */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        {hasImage ? (
          <>
            <ResilientHubCardImage
              src={hub.image}
              isPriority={idx < 6}
              objectPosition={hub.objectPosition}
            />
            {/* Consistent dark tint without sudden brightness flashes on hover */}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-300" />
            <div className="absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-t from-[#07080d] via-[#07080d]/85 via-45% to-transparent" />
          </>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#161822] via-[#0e1017] to-[#07080d] flex items-center justify-center p-4">
            {/* Subtle atmospheric ambient glow for cards waiting for user image */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(35,173,229,0.08),transparent_70%)] group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-t from-[#07080d] via-[#07080d]/80 to-transparent" />
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 p-2.5 sm:p-3.5">
        <h3 className="line-clamp-1 text-xs sm:text-[13px] md:text-sm font-extrabold leading-snug tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] group-hover:text-white transition-colors">
          {hub.title}
        </h3>
      </div>
    </Link>
  );
}

export default function GenresPage() {
  const queryClient = useQueryClient();

  const handlePrefetchHub = useCallback(
    (hub: HubCard) => {
      // ── Prefetch các chủ đề gốc ──
      if (hub.slug === 'phim-han-quoc') {
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
      } else if (hub.slug === 'anime-hoat-hinh') {
        void queryClient.prefetchQuery({
          queryKey: ['films-type', 'anime', 1],
          queryFn: () => movieApi.getByCountryFast('nhat-ban', 1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      } else if (
        hub.slug === 'doraemon' ||
        hub.slug === 'conan' ||
        hub.slug === 'marvel' ||
        hub.slug === 'dc' ||
        hub.slug === 'khoa-hoc-vu-tru'
      ) {
        void queryClient.prefetchQuery({
          queryKey: ['films-universe', hub.slug, 1],
          queryFn: async () => {
            const { getUniverseFilms } = await import('@/lib/universe-catalog');
            return getUniverseFilms(hub.slug as any);
          },
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === 'chien-tranh') {
        void queryClient.prefetchQuery({
          queryKey: ['genre', 'chien-tranh', 1],
          queryFn: () => movieApi.getByGenre('chien-tranh', 1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === 'khoa-hoc-vien-tuong') {
        void queryClient.prefetchQuery({
          queryKey: ['genre', 'vien-tuong', 1],
          queryFn: () => movieApi.getByGenre('vien-tuong', 1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === 'phim-gia-tuong') {
        void queryClient.prefetchQuery({
          queryKey: ['genre', 'gia-tuong', 1],
          queryFn: () => movieApi.getByGenre('gia-tuong', 1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === 'reality') {
        void queryClient.prefetchQuery({
          queryKey: ['films-type', 'tv-shows', 1],
          queryFn: () => movieApi.getTvShows(1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === 'kids') {
        void queryClient.prefetchQuery({
          queryKey: ['genre', 'tre-em', 1],
          queryFn: () => movieApi.getByGenre('tre-em', 1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === 'phim-hinh-su') {
        void queryClient.prefetchQuery({
          queryKey: ['genre', 'hinh-su', 1],
          queryFn: () => movieApi.getByGenre('hinh-su', 1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === 'phim-tai-lieu') {
        void queryClient.prefetchQuery({
          queryKey: ['genre', 'tai-lieu', 1],
          queryFn: () => movieApi.getByGenre('tai-lieu', 1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === 'phim-chinh-kich') {
        void queryClient.prefetchQuery({
          queryKey: ['genre', 'chinh-kich', 1],
          queryFn: () => movieApi.getByGenre('chinh-kich', 1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      } else if (hub.slug === 'phim-hai') {
        void queryClient.prefetchQuery({
          queryKey: ['genre', 'hai-huoc', 1],
          queryFn: () => movieApi.getByGenre('hai-huoc', 1).then((r) => r.data),
          staleTime: 30 * 60 * 1000,
        });
      }
    },
    [queryClient],
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
        queryKey: ['genre', 'vien-tuong', 1],
        queryFn: () => movieApi.getByGenre('vien-tuong', 1).then((r) => r.data),
        staleTime: 30 * 60 * 1000,
      });
      void queryClient.prefetchQuery({
        queryKey: ['films-type', 'tv-shows', 1],
        queryFn: () => movieApi.getTvShows(1).then((r) => r.data),
        staleTime: 30 * 60 * 1000,
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [queryClient]);

  return (
    <main
      className={cn(
        cardFont.className,
        'relative min-h-[100dvh] bg-[#0a0b10] text-white pb-20 sm:pb-28 -mt-20 sm:-mt-24 select-none',
      )}
    >
      {/* ── Top Hero Banner ── */}
      <VerticalTabsHeroBanner
        title="Chủ Đề & Tuyển Tập"
        titleClassName="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-white tracking-tight"
        description="Khám phá các vũ trụ điện ảnh và tuyển tập phim đặc sắc nhất được tuyển chọn riêng cho bạn."
        descriptionClassName="text-xs sm:text-sm text-neutral-300 font-normal max-w-xl"
        imageSrc="/Folder-Background/starwar/1140629.jpg"
        objectPosition="center 30%"
        contentClassName="pb-5 sm:pb-6 md:pb-7"
      />

      <div className="relative z-20 w-full px-3.5 sm:px-6 md:pl-20 lg:pl-24 pr-3.5 sm:pr-6 md:pr-10 space-y-8 sm:space-y-12 pt-2 sm:pt-3 pb-16 sm:pb-24">
        {/* ── Danh Mục Chủ Đề Điện Ảnh (16 Hubs cân đối 4x4) ── */}
        <section aria-label="Danh sách chủ đề điện ảnh" className="w-full">
          <h2 className="sr-only">Danh Mục Chủ Đề & Thể Loại</h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 sm:gap-4 md:gap-4.5 lg:gap-5 gap-y-4 sm:gap-y-5.5 pt-3 pb-3 -mt-3">
            {HUBS.map((hub, idx) => (
              <HubCardItem
                key={hub.slug}
                hub={hub}
                idx={idx}
                onPrefetch={handlePrefetchHub}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
