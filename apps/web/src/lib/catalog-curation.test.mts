import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  catalogQualityScore,
  curateCatalogFilms,
  rankHotCatalogFilms,
} from './catalog-curation.ts';

function film(slug: string, genre: string, rating: number, votes: number, country = 'au-my') {
  return {
    slug,
    name: slug,
    year: 2025,
    poster_url: `https://example.com/${slug}.jpg`,
    category: [{ slug: genre }],
    country: [{ slug: country }],
    tmdb: { vote_average: rating, vote_count: votes },
  };
}

test('a well-established title outranks a one-vote score', () => {
  const established = film('established', 'chinh-kich', 7.8, 530);
  const suspicious = film('suspicious', 'chinh-kich', 9.5, 1);
  assert.ok(catalogQualityScore(established, 'series') > catalogQualityScore(suspicious, 'series'));
});

test('single catalogue does not begin with only horror and animation', () => {
  const input = [
    ...Array.from({ length: 12 }, (_, index) =>
      film(`horror-${index}`, 'kinh-di', 8.4, 1000 - index),
    ),
    ...Array.from({ length: 8 }, (_, index) =>
      film(`anime-${index}`, 'hoat-hinh', 8.3, 900 - index, 'nhat-ban'),
    ),
    ...Array.from({ length: 12 }, (_, index) =>
      film(`drama-${index}`, 'chinh-kich', 7.8, 500 - index, index % 2 ? 'han-quoc' : 'au-my'),
    ),
  ];

  const curated = curateCatalogFilms(input, 'single').slice(0, 16);
  const horrorCount = curated.filter((item) =>
    item.category.some((category) => category.slug === 'kinh-di'),
  ).length;
  const animationCount = curated.filter((item) =>
    item.category.some((category) => category.slug === 'hoat-hinh'),
  ).length;

  assert.ok(horrorCount <= 4);
  assert.ok(animationCount <= 3);
  assert.ok(curated.some((item) => item.slug.startsWith('drama-')));
  assert.equal(curateCatalogFilms(input, 'single').length, input.length);
});

test('different seasons of one franchise do not fill the first positions', () => {
  const input = [
    film('galaxy-season-2', 'vien-tuong', 8.7, 1700),
    film('galaxy-season-1', 'vien-tuong', 8.7, 1690),
    film('crime-story', 'hinh-su', 8.2, 800, 'han-quoc'),
    film('family-story', 'gia-dinh', 8.1, 700, 'trung-quoc'),
  ];
  input[0].origin_name = 'Galaxy Season 2';
  input[1].origin_name = 'Galaxy Season 1';

  const curated = curateCatalogFilms(input, 'series');
  assert.notEqual(curated[0].slug.startsWith('galaxy'), curated[1].slug.startsWith('galaxy'));
  assert.equal(curated.length, input.length);
});

test('hot shelves prioritize real seven-day trends over catalogue order', () => {
  const regular = film('regular', 'kinh-di', 8.4, 1200);
  const trending = film('trending', 'kinh-di', 7.5, 450);
  const ranked = rankHotCatalogFilms([regular, trending], [{ slug: 'trending', views: 240 }]);

  assert.equal(ranked[0].slug, 'trending');
});

test('hot shelves favor fresh trusted titles over one-vote scores', () => {
  const established = film('fresh-hit', 'co-trang', 8.1, 2500);
  established.year = new Date().getFullYear();
  const suspicious = film('one-vote', 'co-trang', 9.9, 1);
  suspicious.year = new Date().getFullYear();

  assert.equal(rankHotCatalogFilms([suspicious, established])[0].slug, 'fresh-hit');
});

test('theatrical hot shelves keep current releases ahead of old hits', () => {
  const classic = film('classic-hit', 'hanh-dong', 8.7, 12000);
  classic.year = 2010;
  const current = film('current-release', 'hanh-dong', 7.2, 180);
  current.year = new Date().getFullYear();

  assert.equal(
    rankHotCatalogFilms([classic, current], [], { releaseFocused: true })[0].slug,
    'current-release',
  );
});

test('browse quick filters do not duplicate Marvel and DC universe entries', () => {
  const source = readFileSync('src/app/films/BrowseFilmsClient.tsx', 'utf8');
  const quickTypes = source.match(/const QUICK_TYPES = \[[\s\S]*?\n\];/)?.[0];

  assert.ok(quickTypes);
  assert.doesNotMatch(quickTypes, /Marvel Studios|DC Universe/);
});

test('catalog routes keep direct-load server seeds without forcing document navigation', () => {
  const serverCatalog = readFileSync('src/lib/server-catalog.ts', 'utf8');
  const browsePage = readFileSync('src/app/films/page.tsx', 'utf8');
  const genrePage = readFileSync('src/app/genre/[slug]/page.tsx', 'utf8');
  const countryPage = readFileSync('src/app/country/[slug]/page.tsx', 'utf8');
  const genreClient = readFileSync('src/app/genre/[slug]/GenrePageClient.tsx', 'utf8');
  const countryClient = readFileSync('src/app/country/[slug]/CountryPageClient.tsx', 'utf8');
  const watchClient = readFileSync('src/app/watch/[slug]/WatchPageClient.tsx', 'utf8');
  const backgroundServices = readFileSync(
    'src/components/layout/ClientBackgroundServices.tsx',
    'utf8',
  );

  assert.match(serverCatalog, /Promise\.any\(attempts\)/);
  assert.match(serverCatalog, /"chieu-rap": "chieu-rap"/);
  assert.match(serverCatalog, /"phim-bo-dang-chieu": "dang-chieu"/);
  assert.match(serverCatalog, /"phim-bo-hoan-thanh": "hoan-thanh"/);
  assert.match(serverCatalog, /"song-ngu-ai": "thuyet-minh"/);
  assert.match(serverCatalog, /requireCategoryMetadata: true/);
  assert.match(serverCatalog, /minItems: 20/);
  assert.match(browsePage, /getInitialBrowseCatalog/);
  assert.match(genrePage, /getInitialGenreCatalog\(slug, page\)/);
  assert.match(countryPage, /getInitialCountryCatalog\(slug, page\)/);
  assert.match(genreClient, /initialDataUpdatedAt/);
  assert.match(countryClient, /initialFastData/);
  assert.doesNotMatch(browsePage, /["']use client["']/);
  assert.doesNotMatch(genrePage, /["']use client["']/);
  assert.doesNotMatch(countryPage, /["']use client["']/);
  assert.match(backgroundServices, /\[data-eager-hydration='true'\]/);
  assert.match(backgroundServices, /new MouseEvent\("click"/);
  assert.match(genreClient, /data-eager-hydration="true"/);
  assert.match(countryClient, /data-eager-hydration="true"/);
  assert.match(genreClient, /w-1\/4 sm:w-1\/5/);
  assert.match(countryClient, /w-1\/4 sm:w-1\/5/);
  assert.match(watchClient, /data-eager-hydration="true"/);
  assert.match(genrePage, /requestHeaders\.get\("rsc"\) === "1"/);
  assert.match(countryPage, /requestHeaders\.get\("rsc"\) === "1"/);
  assert.doesNotMatch(backgroundServices, /const isCatalogDestination/);
  assert.doesNotMatch(backgroundServices, /window\.location\.assign\(destination\.href\)/);
});

test('film type routes seed document loads and unblock client route transitions', () => {
  const page = readFileSync('src/app/films/[type]/page.tsx', 'utf8');
  const client = readFileSync('src/app/films/[type]/FilmsTypeClient.tsx', 'utf8');
  const loading = readFileSync('src/app/films/[type]/loading.tsx', 'utf8');

  assert.doesNotMatch(page, /["']use client["']/);
  assert.match(page, /requestHeaders\.get\("rsc"\) === "1"/);
  assert.match(page, /getInitialFilmCatalog\(type, page\)/);
  assert.match(client, /withCatalogTimeout/);
  assert.match(client, /staleTime: initialData \? 0 : 30 \* 60 \* 1000/);
  assert.match(client, /refetchOnMount: initialData \? "always" : true/);
  assert.match(client, /Chưa thể tải danh sách phim/);
  assert.doesNotMatch(loading, /useParams|useSearchParams|["']use client["']/);
});

test('topic pages keep quick navigation visible and use title-only topic cards', () => {
  const genres = readFileSync('src/app/genres/page.tsx', 'utf8');
  const sidebar = readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
  const mobileNav = readFileSync('src/components/layout/MobileBottomNav.tsx', 'utf8');

  assert.doesNotMatch(genres, /Top10RankedRow|ai-top10-recommendations/);
  assert.match(genres, />\s*Chủ Đề\s*<\/h1>/);
  assert.doesNotMatch(genres, /Chọn nhanh thế giới phim bạn muốn khám phá/);
  assert.doesNotMatch(genres, /hub\.(?:tagline|highlight|countBadge)/);
  assert.match(sidebar, /const isUniversePage = pathname\.startsWith\(["']\/universe\/["']\)/);
  assert.match(sidebar, /data-hero-banner=\"true\"/);
  assert.match(sidebar, /const isVisible = isAlwaysPinnedPage \|\| \(isHeroBannerPage && scrolledPastHero\);/);
  assert.match(sidebar, /if \(!mounted \|\| !shouldShowSidebar\) return null/);
  assert.match(
    sidebar,
    /item\.href === ["']\/genres["'][\s\S]*isGenrePage \|\| isCountryPage \|\| isUniversePage/,
  );
  assert.match(mobileNav, /pathname\.startsWith\(["']\/universe\/["']\)/);
  assert.match(mobileNav, /if \(!mounted \|\| pathname === '\/login'/);
  assert.doesNotMatch(mobileNav, /event\.preventDefault\(\)/);
  assert.doesNotMatch(mobileNav, /window\.location\.assign/);
  assert.doesNotMatch(mobileNav, /onClick=\{\(\) => router\.push/);
});

test('desktop quick navigation stays visible on watch party, history, and saved pages', () => {
  const sidebar = readFileSync('src/components/layout/Sidebar.tsx', 'utf8');

  assert.match(sidebar, /const isUserActivityPage =/);
  for (const route of ['/watch-party', '/history', '/watchlist', '/library']) {
    assert.ok(sidebar.includes(`pathname === '${route}'`));
  }
  assert.match(sidebar, /isPinnedPage[\s\S]*isUserActivityPage/);
});

test('Marvel and DC expose the timeline as a dedicated content tab', () => {
  const universe = readFileSync('src/components/universe/UniversePageClient.tsx', 'utf8');

  assert.match(universe, /role="tablist"/);
  assert.match(universe, /contentTab === ["']collection["']/);
  assert.match(universe, /contentTab === ["']timeline["']/);
  assert.match(universe, /contentTab === ["']timeline["'][\s\S]*<UniverseTimelineSection/);
});

test('homepage exposes the three requested catalogue sections with exact labels', () => {
  const source = readFileSync('src/app/HomePageClient.tsx', 'utf8');

  for (const [id, title, href] of [
    ['horror', 'Phim Kinh Dị', '/genre/kinh-di'],
    ['historical', 'Phim Cổ Trang', '/genre/co-trang'],
    ['theatrical', 'Phim Chiếu Rạp', '/films/chieu-rap'],
  ]) {
    assert.match(source, new RegExp(`${id}: \\(`));
    assert.match(source, new RegExp(title));
    assert.match(source, new RegExp(`href=\"${href}\"`));
  }

  assert.match(
    source,
    /defaultSectionOrder[\s\S]*?"horror"[\s\S]*?"historical"[\s\S]*?"theatrical"/,
  );
  assert.match(source, /defaultSectionOrder\.filter\([\s\S]*?!savedSectionOrder\.includes/);
});

test('themed homepage collections collapse to standard card rails on mobile', () => {
  const homepage = readFileSync('src/app/HomePageClient.tsx', 'utf8');

  assert.match(
    homepage,
    /data-mobile-simple-section="historical"[\s\S]*className="md:hidden"[\s\S]*title=\{t\("sections\.historical", "Phim Cổ Trang"\)\}/,
  );
  assert.match(homepage, /className="hidden md:block"[\s\S]*cardVariant="poster-pill"/);
  assert.match(
    homepage,
    /data-mobile-simple-section="weekly"[\s\S]*className="md:hidden"[\s\S]*<FilmSection[\s\S]*title="Phim Bộ & Phim Lẻ Tuần Này"/,
  );
  assert.match(homepage, /className="hidden md:block"[\s\S]*<WeeklyCuratedShowcase/);
});

test('FilmCard renders bilingual badge with Languages icon and lavender gradient for song-ngu items', () => {
  const filmCardSource = readFileSync('src/components/film/FilmCard.tsx', 'utf8');

  assert.match(filmCardSource, /import\s*\{[^}]*Languages[^}]*\}\s*from\s*['"]lucide-react['"]/);
  assert.match(filmCardSource, /const hasBilingual =/);
  assert.match(filmCardSource, /vicdn/);
  assert.match(filmCardSource, /xink/);
  assert.match(filmCardSource, /bilingualBadge\s*\?/);
  assert.match(filmCardSource, /from-\[#e9d5ff\] via-\[#d8b4fe\] to-\[#c084fc\]/);
  assert.match(filmCardSource, /<Languages/);
});
