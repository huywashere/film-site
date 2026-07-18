'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import NextImage from 'next/image';
import { useState, useEffect, useRef } from 'react';
import {
  Play,
  ChevronRight,
  ChevronLeft,
  Info,
  TrendingUp,
  Clock,
  Tv,
  Clapperboard,
  Flame,
  Ghost,
  Heart,
  Smile,
  Rocket,
  Swords,
  Brain,
  Palette,
  AlertTriangle,
} from 'lucide-react';
import { movieApi } from '@/lib/api';
import { FilmCard, FilmCardSkeleton, FilmItem, resolveImageUrl } from '@/components/film/FilmCard';
import { useTranslation } from '@/store/langStore';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './page.module.css';

// ── Hero Carousel ───────────────────────────────────────────
function HeroBanner({ films }: { films: FilmItem[] }) {
  const [current, setCurrent] = useState(0);
  const { t } = useTranslation();
  const featured = films.slice(0, 5);

  useEffect(() => {
    const t = setInterval(() => setCurrent((c) => (c + 1) % featured.length), 6000);
    return () => clearInterval(t);
  }, [featured.length]);

  const film = featured[current];
  if (!film) return null;

  const poster = resolveImageUrl(film.thumb_url) || resolveImageUrl(film.poster_url);

  return (
    <div className={styles.hero}>
      {/* Background */}
      {poster && (
        <NextImage
          key={film.slug}
          src={poster}
          alt={film.name}
          fill
          priority
          sizes="100vw"
          className={styles.heroBg}
          style={{ objectFit: 'cover', objectPosition: 'center top' }}
          unoptimized
        />
      )}

      {/* Gradient overlays */}
      <div className={styles.heroGradientLeft} />
      <div className={styles.heroGradientBottom} />
      <div className={styles.heroGradientRight} />

      {/* Content */}
      <div className={`container ${styles.heroContent}`}>
        <div className={styles.heroInfo}>
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {/* Badges */}
              <div className={styles.heroBadges}>
                {film.type && (
                  <span className="badge badge-accent">
                    {film.type === 'series'
                      ? t('nav.series')
                      : film.type === 'single'
                        ? t('nav.single')
                        : film.type === 'hoathinh'
                          ? t('nav.anime')
                          : t('nav.tvshows')}
                  </span>
                )}
                {film.year && <span className="badge badge-muted">{film.year}</span>}
              </div>

              {/* Title */}
              <h1 className={styles.heroTitle}>{film.name}</h1>
              {film.origin_name && <p className={styles.heroSubtitle}>{film.origin_name}</p>}

              {/* Actions */}
              <div className={styles.heroActions}>
                <Link href={`/watch/${film.slug}`} className="btn btn-primary btn-lg">
                  <Play size={18} fill="currentColor" /> {t('home.watchNow')}
                </Link>
                <Link href={`/film/${film.slug}`} className="btn btn-secondary btn-lg">
                  <Info size={18} /> {t('home.details')}
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Slide indicators */}
        <div className={styles.heroIndicators}>
          {featured.map((_, i) => (
            <button
              key={i}
              className={`${styles.indicator} ${i === current ? styles.indicatorActive : ''}`}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>
      </div>

      {/* Arrow controls */}
      <button
        className={`${styles.heroArrow} ${styles.heroArrowLeft}`}
        onClick={() => setCurrent((c) => (c - 1 + featured.length) % featured.length)}
        aria-label="Trước"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        className={`${styles.heroArrow} ${styles.heroArrowRight}`}
        onClick={() => setCurrent((c) => (c + 1) % featured.length)}
        aria-label="Tiếp"
      >
        <ChevronRight size={20} />
      </button>

      {/* Film strip thumbnails */}
      <div className={styles.heroStrip}>
        {featured.map((f, i) => {
          const thumb = resolveImageUrl(f.thumb_url) || resolveImageUrl(f.poster_url);
          return (
            <button
              key={f.slug || i}
              className={`${styles.stripItem} ${i === current ? styles.stripItemActive : ''}`}
              onClick={() => setCurrent(i)}
              type="button"
            >
              {thumb && (
                <NextImage
                  src={thumb}
                  alt={f.name}
                  fill
                  sizes="150px"
                  style={{ objectFit: 'cover' }}
                  unoptimized
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.25, 0.8, 0.25, 1] },
  },
};

// ── Film Row Section ────────────────────────────────────────
function FilmSection({
  title,
  icon: Icon,
  films,
  isLoading,
  href,
}: {
  title: string;
  icon: React.ElementType;
  films: FilmItem[];
  isLoading: boolean;
  href: string;
}) {
  const { t } = useTranslation();
  return (
    <section className={styles.section}>
      <div className="section-header">
        <h2 className="section-title">
          <Icon size={14} /> {title}
        </h2>
        <Link href={href} className="section-link">
          {t('home.viewAll')} <ChevronRight size={14} />
        </Link>
      </div>

      <motion.div
        className={`scroll-row ${styles.filmRow}`}
        style={{ alignItems: 'flex-start' }}
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-40px' }}
      >
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <FilmCardSkeleton key={i} width={200} />)
          : films.slice(0, 10).map((film) => (
              <motion.div key={film.slug} variants={cardVariants} style={{ flexShrink: 0 }}>
                <FilmCard film={film} width={200} variant="standard" />
              </motion.div>
            ))}
      </motion.div>
    </section>
  );
}

// ── Recently Reviewed Mini Feed ─────────────────────────────
function ReviewFeed({ reviews }: { reviews: any[] }) {
  if (!reviews?.length) return null;
  return (
    <section className={styles.section}>
      <div className="section-header">
        <h2 className="section-title">Đánh Giá Gần Đây</h2>
        <Link href="/reviews" className="section-link">
          Xem thêm <ChevronRight size={14} />
        </Link>
      </div>
      <div className={styles.reviewFeed}>
        {reviews.slice(0, 6).map((r: any) => (
          <Link key={r.id} href={`/film/${r.movieId}`} className={styles.reviewCard}>
            <div className={styles.reviewMeta}>
              <img
                src={
                  r.user?.avatarUrl ||
                  `https://ui-avatars.com/api/?name=${r.user?.username}&background=14181c&color=00c030&size=32`
                }
                alt=""
                className="avatar avatar-sm"
              />
              <div>
                <p className={styles.reviewUser}>{r.user?.displayName || r.user?.username}</p>
                <p className="text-xs text-muted">{r.movie?.title || r.movieId}</p>
              </div>
              {r.rating && (
                <span
                  style={{
                    marginLeft: 'auto',
                    color: 'var(--star-color)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {'★'.repeat(Math.round(r.rating))}
                </span>
              )}
            </div>
            <p className={`${styles.reviewContent} line-clamp-3`}>{r.content}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ── Genre Highlight Bar ─────────────────────────────────────
const GENRE_HIGHLIGHTS = [
  { label: 'Hành Động', slug: 'hanh-dong', icon: Flame },
  { label: 'Kinh Dị', slug: 'kinh-di', icon: Ghost },
  { label: 'Tình Cảm', slug: 'tinh-cam', icon: Heart },
  { label: 'Hài Hước', slug: 'hai-huoc', icon: Smile },
  { label: 'Viễn Tưởng', slug: 'khoa-hoc-vien-tuong', icon: Rocket },
  { label: 'Cổ Trang', slug: 'co-trang', icon: Swords },
  { label: 'Tâm Lý', slug: 'tam-ly', icon: Brain },
  { label: 'Hoạt Hình', slug: 'hoat-hinh', icon: Palette },
];

function GenreBar() {
  return (
    <section className={styles.genreBar}>
      <div className="container">
        <div className={styles.genreList}>
          {GENRE_HIGHLIGHTS.map((g) => {
            const Icon = g.icon;
            return (
              <Link
                key={g.slug}
                href={`/genre/${g.slug}`}
                className={styles.genreChip}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Icon size={14} />
                <span>{g.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Main Home Page ──────────────────────────────────────────
export default function HomePage() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    data: latestData,
    isLoading: latestLoading,
    error: latestError,
  } = useQuery({
    queryKey: ['latest', 1],
    queryFn: () => movieApi.getLatest(1).then((r) => r.data),
  });

  const { data: seriesData, isLoading: seriesLoading } = useQuery({
    queryKey: ['series', 1],
    queryFn: () => movieApi.getSeries(1).then((r) => r.data),
  });

  const { data: singleData, isLoading: singleLoading } = useQuery({
    queryKey: ['single', 1],
    queryFn: () => movieApi.getSingle(1).then((r) => r.data),
  });

  const { data: animeData, isLoading: animeLoading } = useQuery({
    queryKey: ['anime', 1],
    queryFn: () => movieApi.getAnime(1).then((r) => r.data),
  });

  // KKPhim latest: { items: [] }, v1/api: { data: { items: [] } }
  const latestFilms: FilmItem[] = latestData?.items || latestData?.data?.items || [];
  const seriesFilms: FilmItem[] = seriesData?.data?.items || seriesData?.items || [];
  const singleFilms: FilmItem[] = singleData?.data?.items || singleData?.items || [];
  const animeFilms: FilmItem[] = animeData?.data?.items || animeData?.items || [];

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    // Dynamically import GSAP to prevent SSR window issues
    const initGsap = async () => {
      const { gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      // Animate Hero content
      const hero = containerRef.current?.querySelector('[class*="hero"]');
      if (hero) {
        gsap.fromTo(hero, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out' });
      }

      // Animate sections on scroll
      const sections = containerRef.current?.querySelectorAll('section');
      if (sections) {
        sections.forEach((section) => {
          gsap.fromTo(
            section,
            { opacity: 0, y: 40 },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: section,
                start: 'top 85%',
                toggleActions: 'play none none none',
              },
            },
          );
        });
      }
    };

    initGsap();
  }, [latestFilms, seriesFilms, singleFilms, animeFilms]);

  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('🎬 Latest Data:', latestData);
    console.log('🎬 Latest Films:', latestFilms);
    console.log('🎬 Latest Error:', latestError);
    console.log('🎬 Loading states:', {
      latestLoading,
      seriesLoading,
      singleLoading,
      animeLoading,
    });
  }

  // Show error if loading failed
  if (latestError) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h2
          style={{
            color: 'var(--error)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={24} />
          <span>{t('home.latestError', 'Không thể tải dữ liệu phim')}</span>
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          {t('home.networkError', 'Vui lòng thử lại sau hoặc kiểm tra kết nối mạng.')}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary"
          style={{ marginTop: '1rem' }}
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      {/* Hero */}
      {latestLoading ? <div className={styles.heroSkeleton} /> : <HeroBanner films={latestFilms} />}

      <div className="container" style={{ paddingTop: 'var(--space-3xl)' }}>
        {/* Genre Bar */}
        <GenreBar />

        {/* Phim Mới Cập Nhật */}
        <FilmSection
          title={t('home.latest')}
          icon={Clock}
          films={latestFilms}
          isLoading={latestLoading}
          href="/films"
        />

        {/* Phim Bộ */}
        <FilmSection
          title={t('home.series')}
          icon={Tv}
          films={seriesFilms}
          isLoading={seriesLoading}
          href="/films/series"
        />

        {/* Phim Lẻ */}
        <FilmSection
          title={t('home.single')}
          icon={Clapperboard}
          films={singleFilms}
          isLoading={singleLoading}
          href="/films/single"
        />

        {/* Hoạt Hình */}
        <FilmSection
          title={t('home.anime')}
          icon={TrendingUp}
          films={animeFilms}
          isLoading={animeLoading}
          href="/films/anime"
        />
      </div>
    </div>
  );
}
