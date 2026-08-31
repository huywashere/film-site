-- Indexes are based on the real ORDER BY / WHERE clauses used by NetPhim.
-- Apply during a low-traffic deployment window: Prisma migrations are
-- transactional, therefore CREATE INDEX CONCURRENTLY cannot be used here.
CREATE INDEX IF NOT EXISTS "watch_histories_userId_watchedAt_id_idx"
  ON "watch_histories" ("userId", "watchedAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "watch_histories_userId_movieId_watchedAt_idx"
  ON "watch_histories" ("userId", "movieId", "watchedAt" DESC);

CREATE INDEX IF NOT EXISTS "watchlists_userId_addedAt_id_idx"
  ON "watchlists" ("userId", "addedAt" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "view_logs_movieId_viewedAt_idx"
  ON "view_logs" ("movieId", "viewedAt" DESC);

-- The database fallback search remains fast when Meilisearch is unavailable.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "movies_search_text_trgm_idx"
  ON "movies" USING GIN (
    lower(
      coalesce("title", '') || ' ' ||
      coalesce("titleEn", '') || ' ' ||
      coalesce("originName", '')
    ) gin_trgm_ops
  );

DROP INDEX IF EXISTS "watch_histories_userId_updatedAt_idx";
