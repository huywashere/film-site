ALTER TABLE "movies"
  ADD COLUMN "trailerUrl" TEXT,
  ADD COLUMN "genres" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "countries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "actors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "directors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "releaseSchedule" JSONB;

ALTER TABLE "issue_reports"
  ADD COLUMN "screenshotUrl" TEXT,
  ADD COLUMN "assignedTo" TEXT,
  ADD COLUMN "resolvedBy" TEXT,
  ADD COLUMN "resolutionMessage" TEXT;

ALTER TABLE "reviews"
  ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "moderationNote" TEXT,
  ADD COLUMN "moderatedBy" TEXT,
  ADD COLUMN "moderatedAt" TIMESTAMP(3);

CREATE INDEX "reviews_isHidden_createdAt_idx" ON "reviews"("isHidden", "createdAt" DESC);

ALTER TABLE "sync_jobs"
  ADD COLUMN "requestedPages" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "currentPage" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "heartbeatAt" TIMESTAMP(3);

CREATE TABLE "site_configuration_revisions" (
  "id" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "changedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "site_configuration_revisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "movie_playback_sources" (
  "id" TEXT NOT NULL,
  "movieId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerSlug" TEXT NOT NULL,
  "episodeKey" TEXT NOT NULL DEFAULT 'full',
  "episodeName" TEXT,
  "serverName" TEXT NOT NULL,
  "streamUrl" TEXT,
  "subtitleUrls" JSONB,
  "introStart" INTEGER,
  "introEnd" INTEGER,
  "outroStart" INTEGER,
  "adCuePoints" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "priority" INTEGER NOT NULL DEFAULT 0,
  "healthStatus" TEXT NOT NULL DEFAULT 'unknown',
  "lastCheckedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "movie_playback_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "playback_events" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "movieId" TEXT,
  "sessionId" TEXT,
  "userId" TEXT,
  "route" TEXT,
  "provider" TEXT,
  "serverName" TEXT,
  "episode" TEXT,
  "quality" TEXT,
  "deviceType" TEXT,
  "country" TEXT,
  "errorCode" TEXT,
  "bufferMs" INTEGER,
  "durationMs" INTEGER,
  "fromSource" TEXT,
  "toSource" TEXT,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "playback_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_notifications" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'info',
  "link" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_notification_reads" (
  "notificationId" TEXT NOT NULL,
  "adminKey" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_notification_reads_pkey" PRIMARY KEY ("notificationId", "adminKey")
);

CREATE TABLE "issue_report_events" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorEmail" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" "issue_status",
  "toStatus" "issue_status",
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "issue_report_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "watch_party_archives" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "movieSlug" TEXT,
  "movieName" TEXT,
  "episode" TEXT,
  "hostName" TEXT,
  "peakParticipants" INTEGER NOT NULL DEFAULT 0,
  "messageCount" INTEGER NOT NULL DEFAULT 0,
  "closeReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "watch_party_archives_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "movie_playback_sources_movieId_provider_providerSlug_episodeKey_serverName_key" ON "movie_playback_sources"("movieId", "provider", "providerSlug", "episodeKey", "serverName");
CREATE INDEX "movie_playback_sources_movieId_episodeKey_priority_idx" ON "movie_playback_sources"("movieId", "episodeKey", "priority");
CREATE INDEX "movie_playback_sources_provider_healthStatus_idx" ON "movie_playback_sources"("provider", "healthStatus");
CREATE INDEX "playback_events_occurredAt_eventType_idx" ON "playback_events"("occurredAt" DESC, "eventType");
CREATE INDEX "playback_events_movieId_occurredAt_idx" ON "playback_events"("movieId", "occurredAt" DESC);
CREATE INDEX "playback_events_provider_serverName_occurredAt_idx" ON "playback_events"("provider", "serverName", "occurredAt" DESC);
CREATE INDEX "admin_notifications_createdAt_idx" ON "admin_notifications"("createdAt" DESC);
CREATE INDEX "admin_notification_reads_adminKey_readAt_idx" ON "admin_notification_reads"("adminKey", "readAt" DESC);
CREATE INDEX "issue_report_events_reportId_createdAt_idx" ON "issue_report_events"("reportId", "createdAt" DESC);
CREATE INDEX "site_configuration_revisions_createdAt_idx" ON "site_configuration_revisions"("createdAt" DESC);
CREATE INDEX "watch_party_archives_endedAt_idx" ON "watch_party_archives"("endedAt" DESC);
CREATE INDEX "watch_party_archives_movieSlug_idx" ON "watch_party_archives"("movieSlug");

ALTER TABLE "movie_playback_sources" ADD CONSTRAINT "movie_playback_sources_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "playback_events" ADD CONSTRAINT "playback_events_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "movies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "admin_notification_reads" ADD CONSTRAINT "admin_notification_reads_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "admin_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issue_report_events" ADD CONSTRAINT "issue_report_events_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "issue_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
