import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildHeroCardImageCandidates, buildHeroImageCandidates } from './hero-image.ts';

test('prefers a direct w1280 TMDB backdrop over the original proxy URL', () => {
  const raw = 'https://image.tmdb.org/t/p/original/backdrop.jpg';
  const proxy = `/api/image-proxy?url=${encodeURIComponent(raw)}`;
  const candidates = buildHeroImageCandidates({ heroBackdrop: proxy });

  assert.equal(candidates[0], 'https://image.tmdb.org/t/p/w1280/backdrop.jpg');
  assert.match(candidates.at(-1) || '', /^\/api\/image-proxy\?/);
});

test('uses compact TMDB artwork for above-the-fold hero cards', () => {
  const poster = buildHeroCardImageCandidates(
    { posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg' },
    'poster',
  );
  const thumbnail = buildHeroCardImageCandidates(
    { thumbUrl: 'https://image.tmdb.org/t/p/w1280/backdrop.jpg' },
    'thumbnail',
  );

  assert.equal(poster[0], 'https://image.tmdb.org/t/p/w342/poster.jpg');
  assert.equal(thumbnail[0], 'https://image.tmdb.org/t/p/w300/backdrop.jpg');
});

test('tries every direct card source before relay fallbacks', () => {
  const candidates = buildHeroCardImageCandidates(
    {
      posterUrl: 'https://phimimg.com/missing.jpg',
      thumbUrl: 'https://img.ophim.live/working.jpg',
    },
    'poster',
  );

  assert.deepEqual(candidates.slice(0, 2), [
    'https://phimimg.com/missing.jpg',
    'https://img.ophim.live/working.jpg',
  ]);
  assert.match(candidates[2], /^\/api\/image-proxy\?/);
});

test('prefers direct provider CDN images and only falls back to the same artwork', () => {
  const candidates = buildHeroImageCandidates({
    thumbUrl: 'https://phimimg.com/upload/movie.jpg',
  });

  assert.equal(candidates[0], 'https://phimimg.com/upload/movie.jpg');
  assert.ok(
    candidates.every(
      (candidate) => candidate.includes('phimimg.com') || candidate.startsWith('/api/image-proxy?'),
    ),
  );
});

test('never uses an unrelated local movie as a hero fallback', () => {
  const candidates = buildHeroImageCandidates({
    heroBackdrop: 'https://image.tmdb.org/t/p/w1280/fury.jpg',
  });

  assert.ok(candidates.length >= 2);
  assert.ok(candidates.every((candidate) => !candidate.includes('avengers')));
});

test('deduplicates equivalent hero sources', () => {
  const image = 'https://image.tmdb.org/t/p/w1280/shared.jpg';
  const candidates = buildHeroImageCandidates({
    heroBackdrop: image,
    thumbUrl: image,
  });

  assert.equal(candidates.filter((candidate) => candidate === image).length, 1);
});

test('keeps a clean text title visible until remote hero logo artwork is decoded', () => {
  const source = readFileSync('src/app/components/HeroBanner.tsx', 'utf8');

  assert.match(source, /logoLoaded && hasLogoCandidate \? "opacity-0"/);
  assert.match(source, /decoding="async"/);
  assert.match(source, /failedHeroLogos/);
  assert.match(source, /preloadMovieLogo/);
});

test('keeps the hero background brand-free without autoplaying streamed video', () => {
  const source = readFileSync('src/app/components/HeroBanner.tsx', 'utf8');

  assert.doesNotMatch(source, /<HeroPreviewLayer/);
  assert.doesNotMatch(source, /youtube\.com\/embed/);
});

test('visible film cards do not prefetch every detail route in the background', () => {
  const source = readFileSync('src/components/film/FilmCard.tsx', 'utf8');
  const disabledPrefetchLinks = source.match(/prefetch=\{false\}/g) || [];

  assert.ok(disabledPrefetchLinks.length >= 2);
});

test('hidden desktop and mobile navigation menus do not preload the whole site', () => {
  const navbar = readFileSync('src/components/layout/Navbar.tsx', 'utf8');
  const sidebar = readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
  const mobileBottomNav = readFileSync('src/components/layout/MobileBottomNav.tsx', 'utf8');

  assert.doesNotMatch(sidebar, /prefetch=\{true\}/);
  assert.doesNotMatch(mobileBottomNav, /prefetch=\{true\}/);
  assert.ok((navbar.match(/prefetch=\{false\}/g) || []).length >= 5);
});

test('homepage loading placeholders stop animating after a short warm-up', () => {
  const homepage = readFileSync('src/app/HomePageClient.tsx', 'utf8');
  const artwork = readFileSync('src/components/film/TmdbArtwork.tsx', 'utf8');

  assert.match(homepage, /animation-iteration-count:3/);
  assert.match(artwork, /animation-iteration-count:3/);
});

test('showcase logos keep the current film fallback stable while artwork loads', () => {
  const source = readFileSync('src/components/film/ShowcaseTitleLogo.tsx', 'utf8');

  assert.match(source, /resolvedLogo\?\.slug === film\.slug/);
  assert.match(source, /\}, \[film\.slug, activeLogo\]\);/);
  assert.doesNotMatch(source, /\[film\.slug, activeLogo, currentSrc\]/);
  assert.match(source, /isLoaded[\s\S]*\? 'sr-only'/);
  assert.match(source, /alt=""/);
});

test('shared artwork never hides a successfully decoded native image', () => {
  const source = readFileSync('src/components/film/TmdbArtwork.tsx', 'utf8');

  assert.match(source, /image\?\.complete && image\.naturalWidth > 0/);
  assert.match(source, /backdropW1280/);
  assert.match(source, /const shouldAttemptArtwork = enabled && \(priority \|\| nearViewport\)/);
  assert.match(source, /const src = shouldAttemptArtwork \? candidates\[candidateIndex\] : undefined/);
  assert.doesNotMatch(source, /loaded \? 'opacity-100'/);
});

test('large homepage showcases change slides only after user interaction', () => {
  const series = readFileSync('src/components/film/HeroShowcaseSection.tsx', 'utf8');
  const curated = readFileSync('src/components/film/CuratedSpotlightSection.tsx', 'utf8');

  assert.doesNotMatch(series, /setInterval/);
  assert.doesNotMatch(curated, /setInterval/);
});

test('title lookups never replace provider artwork while it is painting', () => {
  const source = readFileSync('src/components/film/TmdbArtwork.tsx', 'utf8');

  assert.match(source, /unwrapImageUrl\(rawProviderPrimary\)/);
  assert.match(source, /!isTmdbImageUrl\(providerPrimary\)\) add\(providerProxy\)/);
  assert.doesNotMatch(source, /if \(allowTitleLookup\) addTmdbCandidates\(\)/);
  assert.match(source, /providerCandidates\?\.forEach[\s\S]*addTmdbCandidates\(\)/);
});

test('homepage shelves rely on viewport loading instead of eager image bursts', () => {
  const homepage = readFileSync('src/app/HomePageClient.tsx', 'utf8');
  const history = readFileSync('src/components/film/ContinueWatchingRow.tsx', 'utf8');
  const landscape = readFileSync('src/components/film/LandscapeSpotlightRow.tsx', 'utf8');
  const top10 = readFileSync('src/components/film/Top10RankedRow.tsx', 'utf8');

  assert.doesNotMatch(homepage, /priority=\{idx < 4\}/);
  assert.doesNotMatch(history, /priority=\{idx < 5\}/);
  assert.doesNotMatch(landscape, /priority=\{index < 2\}/);
  assert.doesNotMatch(top10, /priority=\{rank <= 5\}/);
  assert.ok((homepage.match(/<LazySection initiallyVisible>/g) || []).length >= 7);
});
