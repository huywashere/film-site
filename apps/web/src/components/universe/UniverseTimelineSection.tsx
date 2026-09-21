'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Clock, Film, Info, Play, Search, Star, X } from 'lucide-react';
import { TmdbArtwork } from '@/components/film/TmdbArtwork';
import type { FilmItem } from '@/components/film/FilmCard';
import { cn } from '@/lib/utils';
import {
  DC_TIMELINE_PHASES,
  getUniverseTimeline,
  MARVEL_TIMELINE_PHASES,
} from '@/lib/universe-timeline-data';

interface UniverseTimelineSectionProps {
  universe: 'marvel' | 'dc';
}

const INITIAL_VISIBLE_FILMS = 10;
const LOAD_MORE_FILMS = 10;

export function UniverseTimelineSection({ universe }: UniverseTimelineSectionProps) {
  const isMarvel = universe === 'marvel';
  const [mode, setMode] = useState<'chronological' | 'release'>('chronological');
  const [selectedPhase, setSelectedPhase] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_FILMS);
  const phases = isMarvel ? MARVEL_TIMELINE_PHASES : DC_TIMELINE_PHASES;

  const timelineFilms = useMemo(
    () =>
      getUniverseTimeline(universe, {
        mode,
        phase: selectedPhase,
        search: searchQuery,
      }),
    [universe, mode, selectedPhase, searchQuery],
  );
  const visibleFilms = timelineFilms.slice(0, visibleCount);
  const remainingFilms = Math.max(0, timelineFilms.length - visibleFilms.length);

  const resetVisibleResults = () => setVisibleCount(INITIAL_VISIBLE_FILMS);

  return (
    <section
      id="universe-timeline"
      role="tabpanel"
      className="relative scroll-mt-32 pb-16 sm:pb-20"
      aria-labelledby="universe-timeline-heading"
    >
      <div className="space-y-5 sm:space-y-7">
        <header className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0d0f15]">
          <div
            aria-hidden="true"
            className={cn('absolute inset-x-0 top-0 h-0.5', isMarvel ? 'bg-red-500' : 'bg-sky-400')}
          />
          <div className="space-y-5 p-4 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
                  <Clock
                    aria-hidden="true"
                    size={14}
                    className={isMarvel ? 'text-red-400' : 'text-sky-400'}
                  />
                  <span>{timelineFilms.length} tác phẩm</span>
                </div>
                <h2
                  id="universe-timeline-heading"
                  className="text-2xl font-black tracking-tight text-white sm:text-3xl"
                >
                  {isMarvel ? 'Dòng thời gian Marvel' : 'Dòng thời gian DC'}
                </h2>
                <p className="max-w-xl text-sm leading-relaxed text-neutral-400">
                  Một lộ trình riêng để xem trọn vũ trụ theo mạch cốt truyện hoặc thứ tự công chiếu.
                </p>
              </div>

              <div
                className="grid w-full grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-[#0d0f15] p-1 sm:w-auto"
                aria-label="Chọn thứ tự dòng thời gian"
              >
                <button
                  type="button"
                  aria-pressed={mode === 'chronological'}
                  onClick={() => {
                    setMode('chronological');
                    resetVisibleResults();
                  }}
                  className={cn(
                    'inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 text-xs font-bold transition-colors active:translate-y-px sm:px-4',
                    mode === 'chronological'
                      ? isMarvel
                        ? 'bg-red-600 text-white'
                        : 'bg-sky-600 text-white'
                      : 'text-neutral-400 hover:bg-white/[0.06] hover:text-white',
                  )}
                >
                  <Clock aria-hidden="true" size={14} />
                  <span>Cốt truyện</span>
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'release'}
                  onClick={() => {
                    setMode('release');
                    resetVisibleResults();
                  }}
                  className={cn(
                    'inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 text-xs font-bold transition-colors active:translate-y-px sm:px-4',
                    mode === 'release'
                      ? isMarvel
                        ? 'bg-red-600 text-white'
                        : 'bg-sky-600 text-white'
                      : 'text-neutral-400 hover:bg-white/[0.06] hover:text-white',
                  )}
                >
                  <Film aria-hidden="true" size={14} />
                  <span>Công chiếu</span>
                </button>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
              <div
                className="flex min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto py-1 no-scrollbar overscroll-x-contain"
                aria-label="Lọc theo giai đoạn"
              >
                {phases.map((phase) => {
                  const isActive = selectedPhase === phase.id;
                  return (
                    <button
                      key={phase.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => {
                        setSelectedPhase(phase.id);
                        resetVisibleResults();
                      }}
                      className={cn(
                        'min-h-9 shrink-0 snap-start whitespace-nowrap rounded-xl border px-3 text-xs font-semibold transition-colors active:translate-y-px',
                        isActive
                          ? isMarvel
                            ? 'border-red-500/50 bg-red-500/15 text-red-200'
                            : 'border-sky-500/50 bg-sky-500/15 text-sky-200'
                          : 'border-white/10 bg-[#11131a] text-neutral-400 hover:border-white/20 hover:text-white',
                      )}
                    >
                      {phase.label}
                    </button>
                  );
                })}
              </div>

              <label className="relative block">
                <span className="sr-only">Tìm phim trong dòng thời gian</span>
                <Search
                  aria-hidden="true"
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    resetVisibleResults();
                  }}
                  placeholder="Tìm trong dòng thời gian"
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-[#11131a] py-2 pl-10 pr-10 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-white/30"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Xóa nội dung tìm kiếm"
                    onClick={() => {
                      setSearchQuery('');
                      resetVisibleResults();
                    }}
                    className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/[0.06] hover:text-white"
                  >
                    <X aria-hidden="true" size={15} />
                  </button>
                )}
              </label>
            </div>
          </div>
        </header>

        {timelineFilms.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#0d0f15] px-5 py-12 text-center">
            <Clock aria-hidden="true" size={28} className="mx-auto text-neutral-600" />
            <p className="mt-3 text-sm font-semibold text-neutral-200">
              Không tìm thấy phim phù hợp
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedPhase('all');
                setSearchQuery('');
                resetVisibleResults();
              }}
              className={cn(
                'mt-4 rounded-xl border px-4 py-2 text-xs font-bold active:translate-y-px',
                isMarvel
                  ? 'border-red-500/40 text-red-300 hover:bg-red-500/10'
                  : 'border-sky-500/40 text-sky-300 hover:bg-sky-500/10',
              )}
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          <div className="relative">
            <div
              aria-hidden="true"
              className={cn(
                'absolute bottom-6 left-[15px] top-6 w-px sm:left-[19px]',
                isMarvel ? 'bg-red-500/45' : 'bg-sky-400/45',
              )}
            />

            <ol className="space-y-3 sm:space-y-4">
              {visibleFilms.map((film) => {
                const order = mode === 'chronological' ? film.chronoOrder : film.releaseOrder;
                return (
                  <li
                    key={film.id}
                    className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-3 sm:grid-cols-[40px_minmax(0,1fr)] sm:gap-4"
                  >
                    <div
                      className={cn(
                        'relative z-[1] mt-4 flex h-8 w-8 items-center justify-center rounded-lg border-2 bg-[#090b10] text-[10px] font-black tabular-nums sm:h-10 sm:w-10 sm:text-xs',
                        isMarvel
                          ? 'border-red-500/55 text-red-300'
                          : 'border-sky-500/55 text-sky-300',
                      )}
                      aria-label={`Vị trí ${order}`}
                    >
                      {String(order).padStart(2, '0')}
                    </div>

                    <article className="min-w-0 overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0d0f15] p-3 transition-colors hover:border-white/20 sm:p-4">
                      <div className="grid gap-3 md:grid-cols-[112px_minmax(0,1fr)_7.5rem] md:items-center md:gap-5">
                        <Link
                          href={`/watch/${film.slug}`}
                          aria-label={`Xem ${film.name}`}
                          className="relative hidden aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-[#0a0c11] md:block"
                        >
                          <TmdbArtwork
                            film={film as unknown as FilmItem}
                            kind="poster"
                            alt={film.name}
                            allowTitleLookup
                            className="absolute inset-0 h-full w-full"
                            imageClassName="object-cover"
                          />
                        </Link>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5',
                                isMarvel ? 'text-red-300' : 'text-sky-300',
                              )}
                            >
                              <Clock aria-hidden="true" size={12} />
                              {mode === 'chronological' ? film.timelineYear : film.releaseYear}
                            </span>
                            <span className="text-neutral-600">/</span>
                            <span className="text-neutral-400">{film.phaseLabel}</span>
                            <span className="ml-auto inline-flex items-center gap-1 text-amber-300">
                              <Star aria-hidden="true" size={11} className="fill-amber-300" />
                              {film.vote_average.toFixed(1)}
                            </span>
                          </div>

                          <div className="mt-2 flex gap-3 md:block">
                            <Link
                              href={`/watch/${film.slug}`}
                              aria-label={`Xem ${film.name}`}
                              className="relative h-[112px] w-[76px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#0a0c11] md:hidden"
                            >
                              <TmdbArtwork
                                film={film as unknown as FilmItem}
                                kind="poster"
                                alt={film.name}
                                allowTitleLookup
                                className="absolute inset-0 h-full w-full"
                                imageClassName="object-cover"
                              />
                            </Link>

                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/watch/${film.slug}`}
                                className="line-clamp-2 text-sm font-extrabold leading-snug text-white hover:text-neutral-200 sm:text-base"
                              >
                                {film.name}
                              </Link>
                              <p className="mt-1 line-clamp-1 text-xs text-neutral-500">
                                {film.origin_name} ({film.releaseYear})
                              </p>
                              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-neutral-300 sm:line-clamp-2">
                                {film.contextNote}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 border-t border-white/[0.07] pt-3 md:grid-cols-1 md:border-l md:border-t-0 md:pl-4 md:pt-0">
                          <Link
                            href={`/watch/${film.slug}`}
                            className={cn(
                              'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold text-white active:translate-y-px',
                              isMarvel
                                ? 'bg-red-600 hover:bg-red-500'
                                : 'bg-sky-600 hover:bg-sky-500',
                            )}
                          >
                            <Play aria-hidden="true" size={13} className="fill-current" />
                            <span>Xem phim</span>
                          </Link>
                          <Link
                            href={`/film/${film.slug}`}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-neutral-300 hover:bg-white/[0.08] hover:text-white active:translate-y-px"
                          >
                            <Info aria-hidden="true" size={13} />
                            <span>Chi tiết</span>
                          </Link>
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>

            {remainingFilms > 0 && (
              <div className="pl-11 pt-5 sm:pl-14">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + LOAD_MORE_FILMS)}
                  className={cn(
                    'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border bg-[#101219] px-4 text-sm font-bold transition-colors active:translate-y-px sm:w-auto',
                    isMarvel
                      ? 'border-red-500/35 text-red-200 hover:bg-red-500/10'
                      : 'border-sky-500/35 text-sky-200 hover:bg-sky-500/10',
                  )}
                >
                  <span>Xem thêm {Math.min(LOAD_MORE_FILMS, remainingFilms)} mốc</span>
                  <ChevronDown aria-hidden="true" size={15} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
