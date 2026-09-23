-- Search predicates use independent ILIKE branches. Separate trigram indexes let
-- PostgreSQL combine them with BitmapOr instead of scanning the full movie table.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

CREATE INDEX IF NOT EXISTS "movies_title_trgm_idx"
  ON "movies" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "movies_titleEn_trgm_idx"
  ON "movies" USING GIN ("titleEn" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "movies_originName_trgm_idx"
  ON "movies" USING GIN ("originName" gin_trgm_ops);

-- Foreign-key columns are not indexed automatically by PostgreSQL. These
-- indexes keep reverse relation lookup and cascades bounded as data grows.
CREATE INDEX IF NOT EXISTS "follows_followingId_idx"
  ON "follows" ("followingId");
CREATE INDEX IF NOT EXISTS "reviews_userId_idx"
  ON "reviews" ("userId");
CREATE INDEX IF NOT EXISTS "review_likes_reviewId_idx"
  ON "review_likes" ("reviewId");
CREATE INDEX IF NOT EXISTS "playlist_items_movieId_idx"
  ON "playlist_items" ("movieId");
