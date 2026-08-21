ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'CONTENT_EDITOR';
ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'OPERATIONS';
ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'ANALYST';

CREATE TYPE "backup_status" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'RESTORED');
CREATE TYPE "incident_status" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

ALTER TABLE "users"
  ADD COLUMN "adminAccessEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "adminPermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "admin_sessions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "admin_sessions_tokenHash_key" ON "admin_sessions"("tokenHash");
CREATE INDEX "admin_sessions_userId_expiresAt_idx" ON "admin_sessions"("userId", "expiresAt");
CREATE INDEX "admin_sessions_expiresAt_revokedAt_idx" ON "admin_sessions"("expiresAt", "revokedAt");
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "sync_schedules" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "cron" TEXT NOT NULL,
  "pages" INTEGER NOT NULL DEFAULT 5,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "nextRunAt" TIMESTAMP(3) NOT NULL,
  "lastRunAt" TIMESTAMP(3),
  "lastJobId" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sync_schedules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sync_schedules_enabled_nextRunAt_idx" ON "sync_schedules"("enabled", "nextRunAt");

CREATE TABLE "database_backups" (
  "id" TEXT NOT NULL,
  "status" "backup_status" NOT NULL DEFAULT 'QUEUED',
  "filename" TEXT,
  "fileSizeBytes" BIGINT,
  "checksum" TEXT,
  "requestedBy" TEXT NOT NULL,
  "restoredBy" TEXT,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "restoredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "database_backups_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "database_backups_createdAt_idx" ON "database_backups"("createdAt" DESC);

CREATE TABLE "system_incidents" (
  "id" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'warning',
  "status" "incident_status" NOT NULL DEFAULT 'OPEN',
  "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
  "metadata" JSONB,
  "acknowledgedBy" TEXT,
  "acknowledgedAt" TIMESTAMP(3),
  "resolvedBy" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "system_incidents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "system_incidents_status_severity_lastSeenAt_idx" ON "system_incidents"("status", "severity", "lastSeenAt" DESC);
CREATE INDEX "system_incidents_fingerprint_status_idx" ON "system_incidents"("fingerprint", "status");

ALTER TABLE "site_configuration"
  ADD COLUMN "homeTop10Slugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "homeSectionOrder" TEXT[] NOT NULL DEFAULT ARRAY['top10','continue','schedule','latest','vfx','usuk-series','action','scifi']::TEXT[],
  ADD COLUMN "homeHiddenSections" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "homeFeaturedRows" JSONB,
  ADD COLUMN "seoTitle" TEXT DEFAULT 'NetPhim - Xem phim trực tuyến',
  ADD COLUMN "seoDescription" TEXT,
  ADD COLUMN "cacheVersion" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "search_events" (
  "id" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "normalized" TEXT NOT NULL,
  "resultCount" INTEGER NOT NULL DEFAULT 0,
  "route" TEXT,
  "sessionId" TEXT,
  "userId" TEXT,
  "deviceType" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "search_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "search_events_occurredAt_idx" ON "search_events"("occurredAt" DESC);
CREATE INDEX "search_events_normalized_occurredAt_idx" ON "search_events"("normalized", "occurredAt" DESC);
