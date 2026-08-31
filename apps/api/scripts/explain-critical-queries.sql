-- Run with psql after replacing the two variables below:
-- psql "$DATABASE_URL" -v user_id='USER_CUID' -v search_query='bo gia' -f apps/api/scripts/explain-critical-queries.sql
\set ON_ERROR_STOP on

\echo 'Watch history cursor page'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM watch_histories
WHERE "userId" = :'user_id'
ORDER BY "watchedAt" DESC, id DESC
LIMIT 21;

\echo 'Favorites cursor page'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT w.*, m.title, m."posterUrl", m."thumbUrl"
FROM watchlists w
JOIN movies m ON m.id = w."movieId"
WHERE w."userId" = :'user_id'
ORDER BY w."addedAt" DESC, w.id DESC
LIMIT 21;

\echo 'Top 10 over the real seven-day window'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT "movieId", count(*) AS views
FROM view_logs
WHERE "viewedAt" >= now() - interval '7 days'
GROUP BY "movieId"
ORDER BY views DESC
LIMIT 10;

\echo 'PostgreSQL fallback search (Meilisearch disabled/unavailable)'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, title, "titleEn", "originName", year
FROM movies
WHERE lower(coalesce(title, '') || ' ' || coalesce("titleEn", '') || ' ' || coalesce("originName", ''))
      LIKE '%' || lower(:'search_query') || '%'
  AND "isHidden" = false
LIMIT 24;
