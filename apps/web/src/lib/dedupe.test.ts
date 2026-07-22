import { normalizeTitle, matchMovies, mergeMovieRecords, UnifiedMovieRecord } from './dedupe';

function runDedupeTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING DEDUPLICATION & NORMALIZATION UNIT TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(description: string, condition: boolean) {
    if (condition) {
      console.log(`✅ [PASS] ${description}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${description}`);
      failed++;
    }
  }

  // ── TEST CASE 1: Exact Name Match ─────────────────────────────────
  const t1 = matchMovies(
    { title: 'Biệt Đội Marvel', year: 2023 },
    { title: 'Biệt Đội Marvel', year: 2023 }
  );
  assert('Case 1: Exact Title Match -> Should Match (true)', t1 === true);

  // ── TEST CASE 2: Accent Mismatch (Vietnamese) ────────────────────
  const normAccents = normalizeTitle('Biệt đội Marvel');
  const normNoAccents = normalizeTitle('Biet doi Marvel');
  assert('Case 2a: normalizeTitle removes Vietnamese accents correctly', normAccents === normNoAccents);
  const t2 = matchMovies(
    { title: 'Biệt đội Marvel', year: 2023 },
    { title: 'Biet doi Marvel', year: 2023 }
  );
  assert('Case 2b: Accent Mismatch -> Should Match (true)', t2 === true);

  // ── TEST CASE 3: Case Sensitivity (Uppercase vs Lowercase) ────────
  const t3 = matchMovies(
    { title: 'BIỆT ĐỘI MARVEL' },
    { title: 'biệt đội marvel' }
  );
  assert('Case 3: Case Sensitivity (UPPER vs lower) -> Should Match (true)', t3 === true);

  // ── TEST CASE 4: Extra Whitespace ─────────────────────────────────
  const t4 = matchMovies(
    { title: '  Biệt   Đội  Marvel  ' },
    { title: 'Biệt Đội Marvel' }
  );
  assert('Case 4: Extra Whitespace Handling -> Should Match (true)', t4 === true);

  // ── TEST CASE 5: Different Release Years ─────────────────────────
  const t5 = matchMovies(
    { title: 'Superman', year: 2013 },
    { title: 'Superman', year: 1978 }
  );
  assert('Case 5: Different Release Years (2013 vs 1978) -> Should NOT Match (false)', t5 === false);

  // ── TEST CASE 6: Merge Movie Records (Combine Sources) ───────────
  const movieKKPhim: UnifiedMovieRecord = {
    id: 'marvel-2023',
    slug: 'biet-doi-marvel',
    title: 'Biệt Đội Marvel',
    normalizedTitle: 'biet doi marvel',
    year: 2023,
    type: 'single',
    genres: ['Hành Động'],
    countries: ['Mỹ'],
    sources: [{ provider: 'kkphim', sourceId: 'kkphim-123', url: 'https://phimapi.com/phim/biet-doi-marvel' }],
    updatedAt: Date.now(),
  };

  const movieOPhim: UnifiedMovieRecord = {
    id: 'marvel-2023',
    slug: 'biet-doi-marvel',
    title: 'Biet doi Marvel',
    normalizedTitle: 'biet doi marvel',
    year: 2023,
    type: 'single',
    genres: ['Phiêu Lưu'],
    countries: ['Mỹ'],
    sources: [{ provider: 'ophim', sourceId: 'ophim-456', url: 'https://ophim1.com/phim/biet-doi-marvel' }],
    updatedAt: Date.now(),
  };

  const merged = mergeMovieRecords(movieKKPhim, movieOPhim);
  assert('Case 6a: Merged record has 2 sources (KKPhim + OPhim)', merged.sources.length === 2);
  assert('Case 6b: Merged genres contains both Hành Động and Phiêu Lưu', merged.genres?.includes('Hành Động') && merged.genres?.includes('Phiêu Lưu'));

  console.log('\n----------------------------------------------------');
  console.log(`📊 SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

runDedupeTests();
