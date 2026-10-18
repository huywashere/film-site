import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildHeroCardImageCandidates,
  buildHeroImageCandidates,
  buildHeroResponsiveSrcSet,
} from './hero-image.ts';
import {
  CURATED_HERO_FRANCHISE_POOL,
  CURATED_HERO_SLUG_ALIASES,
  ensureSixHeroFilms,
} from './curated-hero-pool.ts';

test('prefers the cached same-origin TMDB relay while retaining direct and wsrv fallbacks', () => {
  const raw = 'https://image.tmdb.org/t/p/original/backdrop.jpg';
  const proxy = `/api/image-proxy?url=${encodeURIComponent(raw)}`;
  const candidates = buildHeroImageCandidates({ heroBackdrop: proxy });

  assert.equal(
    candidates[0],
    `/api/image-proxy?url=${encodeURIComponent('https://image.tmdb.org/t/p/w1280/backdrop.jpg')}&strict=1`,
  );
  assert.equal(candidates[1], 'https://image.tmdb.org/t/p/w1280/backdrop.jpg');
  assert.equal(candidates[2], raw);
  assert.ok(candidates.some((candidate) => /^https:\/\/wsrv\.nl\/\?/.test(candidate)));
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

test('keeps a stable text title visible while hero logo artwork is loading', () => {
  const source = readFileSync('src/app/components/HeroBanner.tsx', 'utf8');

  assert.match(source, /hasLogoCandidate && logoLoaded \? "opacity-0" : "opacity-100"/);
  assert.match(source, /decoding="sync"/);
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
  const series = readFileSync('src/components/film/HeroShowcaseSection.tsx', 'utf8');
  const curated = readFileSync('src/components/film/CuratedSpotlightSection.tsx', 'utf8');

  assert.match(source, /const \[displayLogo\] = useState/);
  assert.match(source, /const \[displayLogo\] = useState\(\(\) => initialLogo\)/);
  assert.doesNotMatch(source, /setResolvedLogo/);
  assert.match(source, /hasLogoCandidate \? 'pointer-events-none opacity-0'/);
  assert.match(source, /prefetchFilm/);
  assert.match(source, /const primary = buildCandidates\(resolved\)\[0\] \|\| resolved/);
  assert.match(source, /preloadMovieLogo\(primary\)\.then/);
  assert.match(source, /fetchDetails: false/);
  assert.match(source, /alt=""/);
  assert.match(series, /<ShowcaseTitleLogo[\s\S]*key=\{activeFilm\.slug\}/);
  assert.match(curated, /<ShowcaseTitleLogo[\s\S]*key=\{activeFilm\.slug\}/);
});

test('local login and topic artwork use wsrv without Vercel image quota', () => {
  const auth = readFileSync('src/components/auth/CinematicAuthBackground.tsx', 'utf8');
  const topics = readFileSync('src/app/components/TopicBanners.tsx', 'utf8');

  assert.match(auth, /wsrvPublicImageUrl/);
  assert.match(auth, /srcSet=/);
  assert.match(auth, /640w,[\s\S]*1280w,[\s\S]*1920w/);
  assert.match(auth, /const \[useCdnLayer, setUseCdnLayer\] = useState\(false\)/);
  assert.match(auth, /onError=\{\(\) => setUseCdnLayer\(false\)\}/);
  assert.doesNotMatch(auth, /getRandomAuthArtwork/);
  assert.match(topics, /backgroundImage: `url\('\$\{wsrvPublicImageUrl/);
});

test('every topic banner is backed by TMDB artwork and Asian hubs preserve the full frame', () => {
  const genres = readFileSync('src/app/genres/page.tsx', 'utf8');
  const topics = readFileSync('src/app/components/TopicBanners.tsx', 'utf8');

  assert.equal(
    (genres.match(/image: 'https:\/\/image\.tmdb\.org\/t\/p\/w1280\//g) || []).length,
    10,
  );
  assert.equal(
    (topics.match(/image: "https:\/\/image\.tmdb\.org\/t\/p\/w1280\//g) || []).length,
    6,
  );
  assert.doesNotMatch(genres, /image: 'https:\/\/phimimg\.com/);
  assert.doesNotMatch(topics, /image: "\/images\//);
  assert.equal((genres.match(/showFullBanner: true/g) || []).length, 2);
  assert.match(genres, /object-contain object-top/);
  assert.match(genres, /hub\.showFullBanner \? 'h-\[45%\]' : 'h-\[55%\]'/);
});

test('hero banner waits for decoded title logos before revealing a slide', () => {
  const source = readFileSync('src/app/components/HeroBanner.tsx', 'utf8');
  const cache = readFileSync('src/lib/movie-logo-cache.ts', 'utf8');
  const preloader = readFileSync('src/lib/image-preload-cache.ts', 'utf8');

  assert.match(
    source,
    /Promise\.all\(initialLogoUrls\.map\(\(url\) => preloadMovieLogo\(url\)\)\)/,
  );
  assert.match(source, /const \[displayLogo\] = useState/);
  assert.match(source, /hasLogoCandidate && logoLoaded/);
  assert.match(source, /const activateSlide = useCallback/);
  assert.match(source, /const preloadUrl = getPrimaryHeroLogoUrl\(logoUrl\)/);
  assert.match(source, /if \(preloadUrl\) await preloadMovieLogo\(preloadUrl\)/);
  assert.doesNotMatch(source, /Text is a complete visual fallback[\s\S]*onReady\(\)/);
  assert.match(cache, /return preloadImage\(url\)/);
  assert.match(preloader, /await img\.decode\(\)/);
  assert.match(preloader, /preloadPromises/);
  assert.match(preloader, /setTimeout\(\(\) => settle\(false\), 1_800\)/);
});

test('large homepage showcases request original TMDB backdrops only near the viewport', () => {
  const series = readFileSync('src/components/film/HeroShowcaseSection.tsx', 'utf8');
  const curated = readFileSync('src/components/film/CuratedSpotlightSection.tsx', 'utf8');
  const artwork = readFileSync('src/components/film/TmdbArtwork.tsx', 'utf8');

  assert.match(series, /allowTitleLookup[\s\S]*preferOriginal/);
  assert.match(curated, /allowTitleLookup[\s\S]*preferOriginal/);
  assert.doesNotMatch(curated, /preferOriginal[\s\S]*loadImmediately/);
  assert.doesNotMatch(series, /preferOriginal[\s\S]*loadImmediately/);
  assert.match(artwork, /priority \|\| loadImmediately/);
  assert.match(artwork, /tmdbImageVariant\(providerPrimary, 'original'\)/);
  assert.match(artwork, /add\(artworkQuery\.backdropOriginal\)/);
});

test('shared artwork renders provider images before hydration and keeps recovery state', () => {
  const source = readFileSync('src/components/film/TmdbArtwork.tsx', 'utf8');

  assert.match(source, /image\?\.complete && image\.naturalWidth > 0/);
  assert.match(source, /backdropW1280/);
  assert.match(source, /rawProviderPrimary\.startsWith\('\/api\/image-proxy\?'\)/);
  assert.match(
    source,
    /enabled && \(priority \|\| nearViewport \|\| Boolean\(providerPrimary\)\)/,
  );
  assert.match(
    source,
    /const src = shouldAttemptArtwork \? candidates\[candidateIndex\] : undefined/,
  );
  assert.match(source, /object-cover opacity-100/);
  assert.doesNotMatch(source, /loaded \? 'opacity-100' : 'opacity-0'/);
  assert.match(source, /data-artwork-loaded=\{loaded \? 'true' : 'false'\}/);
  assert.match(
    source,
    /isPreOptimizedImageUrl\(src\) \|\| \/\^https\?:\\\/\\\//,
  );
  assert.match(source, /setLoadedSrc\(src\)/);
});

test('large homepage showcases change slides only after user interaction', () => {
  const series = readFileSync('src/components/film/HeroShowcaseSection.tsx', 'utf8');
  const curated = readFileSync('src/components/film/CuratedSpotlightSection.tsx', 'utf8');

  assert.doesNotMatch(series, /setInterval/);
  assert.doesNotMatch(curated, /setInterval/);
});

test('title lookups keep provider artwork stable unless a showcase explicitly prefers TMDB', () => {
  const source = readFileSync('src/components/film/TmdbArtwork.tsx', 'utf8');
  const series = readFileSync('src/components/film/HeroShowcaseSection.tsx', 'utf8');

  assert.match(source, /unwrapImageUrl\(rawProviderPrimary\)/);
  assert.match(
    source,
    /!isTmdbImageUrl\(providerPrimary\)\) \{[\s\S]*add\(providerPrimary\);[\s\S]*add\(providerProxy\);/,
  );
  assert.match(
    source,
    /artworkQuery\.backdropW1280 \|\| tmdbUrl[\s\S]*localImageProxyUrl\(sizedTmdbUrl\)[\s\S]*wsrvImageUrl\(sizedTmdbUrl, preset\)/,
  );
  assert.match(source, /if \(preferTmdb\) addTmdbCandidates\(\)/);
  assert.match(source, /if \(autoRecovery && !preferTmdb\) addTmdbCandidates\(\)/);
  assert.doesNotMatch(source, /\[film\.slug, kind, tmdbUrl\]/);
  assert.doesNotMatch(source, /if \(allowTitleLookup\) addTmdbCandidates\(\)/);
  assert.match(source, /providerCandidates\?\.forEach[\s\S]*addTmdbCandidates\(\)/);
  assert.ok((series.match(/preferTmdb/g) || []).length >= 2);
  assert.match(series, /slice\(0, 30\)/);
});

test('builds art-directed TMDB srcsets for portrait and landscape heroes', () => {
  const image = 'https://image.tmdb.org/t/p/original/artwork.jpg';

  assert.equal(
    buildHeroResponsiveSrcSet(image, 'poster'),
    [
      'https://image.tmdb.org/t/p/w342/artwork.jpg 342w',
      'https://image.tmdb.org/t/p/w500/artwork.jpg 500w',
      'https://image.tmdb.org/t/p/w780/artwork.jpg 780w',
    ].join(', '),
  );
  assert.equal(
    buildHeroResponsiveSrcSet(image, 'backdrop'),
    [
      'https://image.tmdb.org/t/p/w780/artwork.jpg 780w',
      'https://image.tmdb.org/t/p/w1280/artwork.jpg 1280w',
    ].join(', '),
  );
});

test('keeps responsive hero variants on the same-origin relay', () => {
  const raw = 'https://image.tmdb.org/t/p/w1280/artwork.jpg';
  const proxy = `/api/image-proxy?url=${encodeURIComponent(raw)}&strict=1`;
  const srcSet = buildHeroResponsiveSrcSet(proxy, 'backdrop') || '';

  assert.match(srcSet, /^\/api\/image-proxy\?url=/);
  assert.match(srcSet, /strict=1 780w/);
  assert.match(srcSet, /strict=1 1280w/);
  assert.doesNotMatch(srcSet, /, https:\/\/image\.tmdb\.org/);
});

test('hero uses poster art on portrait phones and tablets, backdrop art elsewhere', () => {
  const source = readFileSync('src/app/components/HeroBanner.tsx', 'utf8');

  assert.match(source, /\(max-width: 1023px\) and \(orientation: portrait\)/);
  assert.match(source, /srcSet=\{portraitSrcSet \|\| portraitSrc\}/);
  assert.match(source, /srcSet=\{landscapeSrcSet\}/);
  assert.match(
    source,
    /object-\[center_18%\][\s\S]*md:object-\[center_24%\][\s\S]*lg:object-center/,
  );
  assert.match(
    source,
    /preferredHeroBackdrops = new Map<[\s\S]*portrait\?: string; landscape\?: string/,
  );
  assert.match(source, /\[usesPortraitArtwork \? "portrait" : "landscape"\]: readyBackdrop/);
  assert.match(source, /function addHeroEdgeFallback\([\s\S]*https:\/\/wsrv\.nl\//);
  assert.match(source, /wsrvImageUrl\(directTmdb, "poster"\)/);
  assert.match(source, /function preferSameOriginHeroCandidates/);
  assert.match(source, /object-\[center_18%\] opacity-100/);
  assert.doesNotMatch(source, /revealed \|\| decoded/);
  assert.match(source, /netphim\.tmdb-hero\.v9/);
  assert.match(source, /LEGACY_HERO_SESSION_KEYS[\s\S]*sessionStorage\.removeItem/);
});

test('hero keeps decoded artwork visible while a responsive source retries', () => {
  const source = readFileSync('src/app/components/HeroBanner.tsx', 'utf8');

  assert.match(source, /const \[lastGoodSource, setLastGoodSource\] = useState/);
  assert.match(source, /data-hero-backdrop-fallback="true"/);
  assert.match(source, /lastGoodSource && \(!decoded \|\| exhausted\)/);
  assert.match(source, /setLastGoodSource\(loadedSource\)/);
  assert.match(source, /}, 10_000\)/);
  assert.match(source, /document\.visibilityState !== "visible"/);
});

test('homepage keeps the server hero stable and renders desktop controls in the first HTML', () => {
  const page = readFileSync('src/app/page.tsx', 'utf8');
  const hero = readFileSync('src/app/components/HeroBanner.tsx', 'utf8');

  assert.match(page, /function getDefaultHeroFilms\(\)/);
  assert.match(page, /CURATED_HERO_FRANCHISE_POOL\.slice\(0, 6\)/);
  assert.doesNotMatch(page, /Math\.random\(\)/);
  assert.doesNotMatch(hero, /showDesktopFanCards/);
  assert.doesNotMatch(hero, /matchMedia\("\(min-width: 1280px\)"\)/);
});

test('homepage rotates six non-repeating films from the complete curated hero pool', () => {
  const hero = readFileSync('src/app/components/HeroBanner.tsx', 'utf8');
  const homepage = readFileSync('src/app/HomePageClient.tsx', 'utf8');
  const slugs = CURATED_HERO_FRANCHISE_POOL.map((film) => film.slug);

  assert.equal(CURATED_HERO_FRANCHISE_POOL.length, 100);
  assert.equal(new Set(slugs).size, 100);
  assert.ok(CURATED_HERO_FRANCHISE_POOL.every((film) => film.heroBackdrop));
  assert.ok(CURATED_HERO_FRANCHISE_POOL.every((film) => film.poster_url));
  assert.match(homepage, /randomizeCuratedPool/);
  assert.match(hero, /selectCuratedHeroPlaylist\(readStoredHeroPlaylist\(\)\)/);
  assert.match(hero, /!previousSlugs\.has\(film\.slug\)/);
  assert.match(hero, /preloadHeroBackdropCandidates\(backdropCandidates, 3_600\)/);
  assert.match(hero, /outgoing && outgoing\.slug !== target\?\.slug/);
  assert.match(homepage, /queryKey: \["public-site-configuration"\][\s\S]*enabled: true/);
});

test('hero keeps metadata visible while title artwork finishes decoding', () => {
  const source = readFileSync('src/app/components/HeroBanner.tsx', 'utf8');
  const page = readFileSync('src/app/page.tsx', 'utf8');

  assert.match(source, /const heroContentReady = Boolean\(visualReadiness\[film\.slug\]\?\.title\)/);
  assert.match(source, /aria-busy=\{!heroContentReady\}/);
  assert.match(source, /touch-pan-y opacity-100/);
  assert.match(source, /decoding="sync"/);
  assert.match(source, /const sameOrigin = localImageProxyUrl\(clean, \{ strict: true \}\)/);
  assert.match(source, /return \[sameOrigin, \.\.\.candidates\]/);
  assert.match(page, /const initialTitleLogo = initialHero\?\.titleLogo/);
  assert.match(page, /href=\{initialTitleLogo\}/);
});

test('shared artwork consumes backend TMDB metadata and emits responsive image candidates', () => {
  const artwork = readFileSync('src/components/film/TmdbArtwork.tsx', 'utf8');
  const hook = readFileSync('src/hooks/useTmdbArtwork.ts', 'utf8');

  assert.match(hook, /film\.artwork\?\.poster_path/);
  assert.match(hook, /enabled: enabled && !embeddedMovie/);
  assert.match(artwork, /posterW185[\s\S]*185w/);
  assert.match(artwork, /posterW342[\s\S]*342w/);
  assert.match(artwork, /posterW500[\s\S]*500w/);
  assert.match(artwork, /backdropW1280[\s\S]*1280w/);
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
  assert.ok((homepage.match(/<LazySection/g) || []).length >= 7);
  assert.ok((homepage.match(/<LazySection initiallyVisible>/g) || []).length >= 2);
});

test('video player keyboard seek step strictly locks to 10 seconds without double triggering', () => {
  const artPlayer = readFileSync('src/components/video/ArtPlayer.tsx', 'utf8');
  const watchPage = readFileSync('src/app/watch/[slug]/WatchPageClient.tsx', 'utf8');

  // ArtPlayer sets SEEK_STEP = 10 and assigns triggerSeekRipple
  assert.match(artPlayer, /SEEK_STEP\s*=\s*10/);
  assert.match(artPlayer, /triggerSeekRipple/);

  // WatchPage has single global keydown listener and seeks exactly 10s
  assert.doesNotMatch(watchPage, /currentTime\s*-\s*5/);
  assert.doesNotMatch(watchPage, /currentTime\s*\+\s*5/);
  assert.match(watchPage, /triggerSeekRipple/);
  assert.match(watchPage, /e\.defaultPrevented\s*\|\|\s*\(e as any\)\._artHandled/);
});

test('ensureSixHeroFilms always guarantees exactly six films on reload/reset', () => {
  // Empty input -> exactly 6
  const emptyPadded = ensureSixHeroFilms([]);
  assert.equal(emptyPadded.length, 6);
  assert.equal(new Set(emptyPadded.map((f) => f.slug)).size, 6);

  // 4 items input -> padded to exactly 6 with unique items
  const fourFilms = [
    { slug: 'phi-cong-sieu-dang-maverick' },
    { slug: 'ke-danh-cap-giac-mo' },
    { slug: 'nguoi-nhen-khong-con-nha' },
    { slug: 'oppenheimer' },
  ];
  const fourPadded = ensureSixHeroFilms(fourFilms);
  assert.equal(fourPadded.length, 6);
  assert.equal(fourPadded[0].slug, 'phi-cong-sieu-dang-maverick');
  assert.equal(fourPadded[1].slug, 'ke-danh-cap-giac-mo');
  assert.equal(fourPadded[2].slug, 'nguoi-nhen-khong-con-nha');
  assert.equal(fourPadded[3].slug, 'oppenheimer');
  assert.equal(new Set(fourPadded.map((f) => f.slug)).size, 6);

  // Common aliases correctly resolve to curated pool entries
  assert.equal(CURATED_HERO_SLUG_ALIASES['joker-2019'], 'joker');
  assert.equal(CURATED_HERO_SLUG_ALIASES['the-batman'], 'nguoi-doi-2022');
  assert.equal(CURATED_HERO_SLUG_ALIASES['avengers-hoi-ket'], 'biet-doi-sieu-anh-hung-4-hoi-ket');

  const jokerEntry = CURATED_HERO_FRANCHISE_POOL.find(
    (f) => f.slug === CURATED_HERO_SLUG_ALIASES['joker-2019'],
  );
  assert.ok(jokerEntry);
  assert.equal(jokerEntry?.name, 'Joker');

  const batmanEntry = CURATED_HERO_FRANCHISE_POOL.find(
    (f) => f.slug === CURATED_HERO_SLUG_ALIASES['the-batman'],
  );
  assert.ok(batmanEntry);
  assert.equal(batmanEntry?.name, 'Người Dơi');
});

test('buildHeroImageCandidates prioritizes TMDB HD backdrops over low-res provider thumbnails', () => {
  const candidates = buildHeroImageCandidates({
    heroBackdrop: 'https://phimimg.com/uploads/movies/20261010/bac-si-x-thumb.webp',
    thumbUrl: 'https://image.tmdb.org/t/p/w1280/hMEulOCbZtnS7gFFBDuQCpYQs5a.jpg',
    posterUrl: 'https://image.tmdb.org/t/p/w500/jzqPdwpiDTPzvnbV0pZzTtOIgWz.jpg',
  });

  // The first candidate must be the proxy or direct TMDB w1280 HD backdrop
  assert.ok(decodeURIComponent(candidates[0]).includes('/w1280/hMEulOCbZtnS7gFFBDuQCpYQs5a.jpg'));
  assert.equal(candidates[1], 'https://image.tmdb.org/t/p/w1280/hMEulOCbZtnS7gFFBDuQCpYQs5a.jpg');
  // The raw provider URL should be pushed to the end as fallback
  assert.ok(candidates.indexOf('https://phimimg.com/uploads/movies/20261010/bac-si-x-thumb.webp') > 2);
});

test('buildHeroCardImageCandidates prioritizes TMDB backdrops for 16:9 thumbnail cards', () => {
  const candidates = buildHeroCardImageCandidates(
    {
      heroBackdrop: 'https://image.tmdb.org/t/p/w1280/hMEulOCbZtnS7gFFBDuQCpYQs5a.jpg',
      thumbUrl: 'https://phimimg.com/uploads/movies/20261010/bac-si-x-thumb.webp',
      posterUrl: 'https://phimimg.com/uploads/movies/20261010/bac-si-x-poster.webp',
    },
    'thumbnail',
  );

  // For 16:9 thumbnails, TMDB backdrop resized to w300 should be the first candidate
  assert.equal(candidates[0], 'https://image.tmdb.org/t/p/w300/hMEulOCbZtnS7gFFBDuQCpYQs5a.jpg');
});

