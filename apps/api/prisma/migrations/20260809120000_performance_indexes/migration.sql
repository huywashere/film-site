-- Public catalog filtering and recently-updated queries
-- Older development databases were created before this catalog visibility
-- field was introduced in Prisma, so make the additive migration self-healing.
ALTER TABLE "movies"
ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "movies_type_isHidden_year_idx"
ON "movies"("type", "isHidden", "year");

CREATE INDEX "movies_isHidden_updatedAt_idx"
ON "movies"("isHidden", "updatedAt" DESC);

-- Detail-page review and aggregate rating lookups
CREATE INDEX "reviews_movieId_createdAt_idx"
ON "reviews"("movieId", "createdAt" DESC);

CREATE INDEX "ratings_movieId_idx"
ON "ratings"("movieId");

-- Seven-day trending aggregation scans by time before grouping by movie
CREATE INDEX "view_logs_viewedAt_movieId_idx"
ON "view_logs"("viewedAt" DESC, "movieId");
