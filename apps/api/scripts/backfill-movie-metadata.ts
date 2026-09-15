import { PrismaClient, type Movie } from '@prisma/client';

const prisma = new PrismaClient();
const KKPHIM_DETAIL_BASE = 'https://phimapi.com/phim/';
const KKPHIM_SEARCH = 'https://phimapi.com/v1/api/tim-kiem';
const NGUONC_DETAIL_BASE = 'https://phim.nguonc.com/api/film/';

type UpstreamMovie = Record<string, unknown>;

function option(name: string, fallback: number) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

const concurrency = Math.min(option('concurrency', 6), 12);
const limit = option('limit', Number.MAX_SAFE_INTEGER);
const requestIntervalMs = Math.max(option('request-interval-ms', 400), 100);
const dryRun = process.argv.includes('--dry-run');
let requestGate = Promise.resolve();
let nextRequestAt = 0;

function waitForRequestSlot() {
  const slot = requestGate.then(async () => {
    const waitMs = Math.max(0, nextRequestAt - Date.now());
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    nextRequestAt = Date.now() + requestIntervalMs;
  });
  requestGate = slot.catch(() => undefined);
  return slot;
}

function normalized(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function names(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .map((item) => String((item as { name?: unknown })?.name || item || '').trim())
    .filter(Boolean))]
    .slice(0, 100);
}

function commaSeparatedNames(value: unknown) {
  if (Array.isArray(value)) return names(value);
  return [...new Set(String(value || '').split(',').map((item) => item.trim()).filter(Boolean))]
    .slice(0, 100);
}

function nguoncCategoryNames(movie: UpstreamMovie, groupName: string) {
  const category = movie.category;
  if (!category || typeof category !== 'object' || Array.isArray(category)) return [];
  for (const value of Object.values(category)) {
    const group = value as { group?: { name?: unknown }; list?: unknown };
    if (normalized(group.group?.name) === normalized(groupName)) return names(group.list);
  }
  return [];
}

function upstreamMovie(payload: unknown): UpstreamMovie | null {
  if (!payload || typeof payload !== 'object') return null;
  const value = payload as Record<string, any>;
  const movie = value.movie || value.data?.item || value.item;
  return movie && typeof movie === 'object' ? movie : null;
}

async function fetchJson(url: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      await waitForRequestSlot();
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'FlexPhim-Metadata-Backfill/1.0' },
        signal: AbortSignal.timeout(15_000),
      });
      if (response.status === 404) return null;
      if (response.status === 429) {
        const retryAfterSeconds = Number(response.headers.get('retry-after')) || 0;
        const waitMs = Math.max(retryAfterSeconds * 1_000, attempt * 5_000);
        lastError = new Error(`HTTP 429; retrying in ${waitMs}ms`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 6) await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
  throw lastError;
}

async function findDetail(
  movie: Pick<Movie, 'id' | 'title' | 'year'>,
  sources: Array<{ provider: string; providerSlug: string }>,
) {
  const kkphimSlugs = sources
    .filter((source) => source.provider === 'kkphim')
    .map((source) => source.providerSlug);
  const candidates = [...new Set([...kkphimSlugs, movie.id])]
    .filter((slug) => /^[a-z0-9][a-z0-9-]{2,199}$/i.test(slug));

  for (const slug of candidates) {
    const payload = await fetchJson(`${KKPHIM_DETAIL_BASE}${encodeURIComponent(slug)}`);
    const detail = upstreamMovie(payload);
    if (detail) return { detail, provider: 'kkphim' } as const;
  }

  const searchUrl = `${KKPHIM_SEARCH}?keyword=${encodeURIComponent(movie.title)}&page=1&limit=10`;
  const search = await fetchJson(searchUrl) as Record<string, any> | null;
  const items: UpstreamMovie[] = search?.data?.items || search?.items || [];
  const expected = normalized(movie.title);
  const match = items.find((item) => {
    const titleMatches = [item.name, item.title, item.origin_name, item.original_name]
      .some((title) => normalized(title) === expected);
    const year = Number(item.year) || null;
    return titleMatches && (!movie.year || !year || movie.year === year);
  });
  const slug = String(match?.slug || '');
  if (slug) {
    const detail = upstreamMovie(await fetchJson(`${KKPHIM_DETAIL_BASE}${encodeURIComponent(slug)}`));
    if (detail) return { detail, provider: 'kkphim' } as const;
  }

  const nguoncSlugs = [...new Set([
    ...sources.filter((source) => source.provider === 'nguonc').map((source) => source.providerSlug),
    movie.id,
  ])].filter((value) => /^[a-z0-9][a-z0-9-]{2,199}$/i.test(value));
  for (const nguoncSlug of nguoncSlugs) {
    const detail = upstreamMovie(
      await fetchJson(`${NGUONC_DETAIL_BASE}${encodeURIComponent(nguoncSlug)}`),
    );
    if (detail && normalized(detail.name || detail.title) === expected) {
      return { detail, provider: 'nguonc' } as const;
    }
  }
  return null;
}

function intValue(value: unknown) {
  const match = String(value || '').match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

async function backfill(movie: Movie) {
  const sources = await prisma.moviePlaybackSource.findMany({
    where: { movieId: movie.id },
    distinct: ['provider', 'providerSlug'],
    select: { provider: true, providerSlug: true },
  });
  const found = await findDetail(movie, sources);
  if (!found) return 'not-found' as const;
  const { detail, provider } = found;

  const genres = names(detail.category || detail.categories).length
    ? names(detail.category || detail.categories)
    : nguoncCategoryNames(detail, 'Thể loại');
  const countries = names(detail.country || detail.countries).length
    ? names(detail.country || detail.countries)
    : nguoncCategoryNames(detail, 'Quốc gia');
  const actors = commaSeparatedNames(detail.actor || detail.actors || detail.casts);
  const directors = commaSeparatedNames(detail.director || detail.directors);
  const data = {
    genres: movie.genres.length ? undefined : genres.length ? genres : undefined,
    countries: movie.countries.length ? undefined : countries.length ? countries : undefined,
    actors: movie.actors.length ? undefined : actors.length ? actors : undefined,
    directors: movie.directors.length ? undefined : directors.length ? directors : undefined,
    description: movie.description || String(detail.content || detail.description || '').trim() || undefined,
    trailerUrl: movie.trailerUrl || String(detail.trailer_url || '').trim() || undefined,
    quality: movie.quality || String(detail.quality || '').trim() || undefined,
    language: movie.language || String(detail.lang || detail.language || '').trim() || undefined,
    runtime: movie.runtime || intValue(detail.time),
    totalEpisodes: movie.totalEpisodes || intValue(detail.episode_total || detail.total_episodes),
    sources: movie.sources.includes(provider) ? undefined : [...movie.sources, provider],
  };
  const changes = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
  if (!Object.keys(changes).length) return 'unchanged' as const;
  if (!dryRun) await prisma.movie.update({ where: { id: movie.id }, data: changes });
  return 'updated' as const;
}

async function main() {
  const movies = await prisma.movie.findMany({
    where: {
      OR: [
        { genres: { isEmpty: true } },
        { countries: { isEmpty: true } },
        { actors: { isEmpty: true } },
        { directors: { isEmpty: true } },
      ],
    },
    orderBy: { id: 'asc' },
    take: limit,
  });
  const result = { scanned: movies.length, updated: 0, unchanged: 0, notFound: 0, failed: 0 };
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, movies.length) }, async () => {
    while (cursor < movies.length) {
      const movie = movies[cursor++];
      try {
        const status = await backfill(movie);
        if (status === 'updated') result.updated += 1;
        else if (status === 'unchanged') result.unchanged += 1;
        else result.notFound += 1;
      } catch (error) {
        result.failed += 1;
        console.error(`[metadata] ${movie.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
      const finished = result.updated + result.unchanged + result.notFound + result.failed;
      if (finished % 50 === 0 || finished === movies.length) {
        console.log(`[metadata] ${finished}/${movies.length}`, result);
      }
    }
  });
  await Promise.all(workers);
  console.log(JSON.stringify({ dryRun, ...result }, null, 2));
  if (result.failed > 0) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
