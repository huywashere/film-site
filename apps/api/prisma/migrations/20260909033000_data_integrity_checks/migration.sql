-- Guard values that are validated by the API today so direct SQL writes and
-- future import jobs cannot introduce impossible ratings, durations or counts.
-- NOT VALID keeps the initial table lock short on larger installations; the
-- following VALIDATE statements verify all existing rows.

ALTER TABLE "ratings"
  ADD CONSTRAINT "ratings_score_check"
  CHECK (
    "score" >= 0.5 AND
    "score" <= 5.0 AND
    "score" * 2 = trunc("score" * 2)
  ) NOT VALID;

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_check"
  CHECK (
    "rating" IS NULL OR (
      "rating" >= 0.5 AND
      "rating" <= 5.0 AND
      "rating" * 2 = trunc("rating" * 2)
    )
  ) NOT VALID,
  ADD CONSTRAINT "reviews_like_count_check"
  CHECK ("likeCount" >= 0) NOT VALID;

ALTER TABLE "watch_histories"
  ADD CONSTRAINT "watch_histories_time_check"
  CHECK ("progress" >= 0 AND "duration" >= 0) NOT VALID;

ALTER TABLE "playback_events"
  ADD CONSTRAINT "playback_events_duration_check"
  CHECK (
    ("bufferMs" IS NULL OR "bufferMs" >= 0) AND
    ("durationMs" IS NULL OR "durationMs" >= 0)
  ) NOT VALID;

ALTER TABLE "movie_playback_sources"
  ADD CONSTRAINT "movie_playback_sources_timing_check"
  CHECK (
    ("introStart" IS NULL OR "introStart" >= 0) AND
    ("introEnd" IS NULL OR "introEnd" >= 0) AND
    ("outroStart" IS NULL OR "outroStart" >= 0) AND
    ("introStart" IS NULL OR "introEnd" IS NULL OR "introEnd" >= "introStart") AND
    ("introEnd" IS NULL OR "outroStart" IS NULL OR "outroStart" >= "introEnd")
  ) NOT VALID;

ALTER TABLE "playlists"
  ADD CONSTRAINT "playlists_item_count_check"
  CHECK ("itemCount" >= 0) NOT VALID;

ALTER TABLE "playlist_items"
  ADD CONSTRAINT "playlist_items_position_check"
  CHECK ("position" >= 0) NOT VALID;

ALTER TABLE "sync_jobs"
  ADD CONSTRAINT "sync_jobs_counts_check"
  CHECK (
    "processedCount" >= 0 AND
    "createdCount" >= 0 AND
    "updatedCount" >= 0 AND
    "failedCount" >= 0 AND
    "requestedPages" >= 0 AND
    "currentPage" >= 0 AND
    "retryCount" >= 0
  ) NOT VALID;

ALTER TABLE "watch_party_archives"
  ADD CONSTRAINT "watch_party_archives_counts_check"
  CHECK ("peakParticipants" >= 0 AND "messageCount" >= 0) NOT VALID;

ALTER TABLE "system_incidents"
  ADD CONSTRAINT "system_incidents_occurrence_count_check"
  CHECK ("occurrenceCount" >= 1) NOT VALID;

ALTER TABLE "ad_placements"
  ADD CONSTRAINT "ad_placements_duration_check"
  CHECK (
    ("videoDuration" IS NULL OR "videoDuration" >= 0) AND
    ("skipOffsetSec" IS NULL OR "skipOffsetSec" >= 0)
  ) NOT VALID,
  ADD CONSTRAINT "ad_placements_counts_check"
  CHECK ("impressions" >= 0 AND "clicks" >= 0) NOT VALID;

ALTER TABLE "ratings" VALIDATE CONSTRAINT "ratings_score_check";
ALTER TABLE "reviews" VALIDATE CONSTRAINT "reviews_rating_check";
ALTER TABLE "reviews" VALIDATE CONSTRAINT "reviews_like_count_check";
ALTER TABLE "watch_histories" VALIDATE CONSTRAINT "watch_histories_time_check";
ALTER TABLE "playback_events" VALIDATE CONSTRAINT "playback_events_duration_check";
ALTER TABLE "movie_playback_sources" VALIDATE CONSTRAINT "movie_playback_sources_timing_check";
ALTER TABLE "playlists" VALIDATE CONSTRAINT "playlists_item_count_check";
ALTER TABLE "playlist_items" VALIDATE CONSTRAINT "playlist_items_position_check";
ALTER TABLE "sync_jobs" VALIDATE CONSTRAINT "sync_jobs_counts_check";
ALTER TABLE "watch_party_archives" VALIDATE CONSTRAINT "watch_party_archives_counts_check";
ALTER TABLE "system_incidents" VALIDATE CONSTRAINT "system_incidents_occurrence_count_check";
ALTER TABLE "ad_placements" VALIDATE CONSTRAINT "ad_placements_duration_check";
ALTER TABLE "ad_placements" VALIDATE CONSTRAINT "ad_placements_counts_check";
