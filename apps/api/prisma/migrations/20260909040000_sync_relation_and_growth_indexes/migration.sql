-- Link each schedule to its most recent sync job while preserving the
-- schedule when old job history is cleaned up.
CREATE INDEX IF NOT EXISTS "sync_schedules_lastJobId_idx"
  ON "sync_schedules" ("lastJobId");

ALTER TABLE "sync_schedules"
  ADD CONSTRAINT "sync_schedules_lastJobId_fkey"
  FOREIGN KEY ("lastJobId") REFERENCES "sync_jobs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Recommendation fallback uses PostgreSQL array overlap (hasSome).
CREATE INDEX IF NOT EXISTS "movies_genres_gin_idx"
  ON "movies" USING GIN ("genres");

-- Active-session pages filter by user and sort by most recent use.
CREATE INDEX IF NOT EXISTS "refresh_tokens_active_user_lastUsedAt_idx"
  ON "refresh_tokens" ("userId", "lastUsedAt" DESC)
  WHERE "isRevoked" = false;

-- Playback dashboards commonly combine an event type with a time window.
CREATE INDEX IF NOT EXISTS "playback_events_eventType_occurredAt_idx"
  ON "playback_events" ("eventType", "occurredAt" DESC);
