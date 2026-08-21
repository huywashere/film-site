CREATE TYPE "issue_status" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');
CREATE TYPE "issue_priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');
CREATE TYPE "sync_job_status" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- Admin actors can originate from Firebase or the server-to-server dashboard
-- identity, so audit records must not depend on a matching local user row.
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_adminId_fkey";

CREATE TABLE "issue_reports" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "filmTitle" TEXT,
    "movieSlug" TEXT,
    "episode" TEXT,
    "serverName" TEXT,
    "deviceInfo" TEXT,
    "description" TEXT NOT NULL,
    "email" TEXT,
    "status" "issue_status" NOT NULL DEFAULT 'NEW',
    "priority" "issue_priority" NOT NULL DEFAULT 'NORMAL',
    "adminNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "issue_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sync_jobs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" "sync_job_status" NOT NULL DEFAULT 'QUEUED',
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "requestedBy" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "issue_reports_status_priority_createdAt_idx" ON "issue_reports"("status", "priority", "createdAt" DESC);
CREATE INDEX "issue_reports_movieSlug_idx" ON "issue_reports"("movieSlug");
CREATE INDEX "sync_jobs_createdAt_idx" ON "sync_jobs"("createdAt" DESC);
CREATE INDEX "sync_jobs_source_status_idx" ON "sync_jobs"("source", "status");

CREATE TABLE "site_configuration" (
    "id" TEXT NOT NULL DEFAULT 'primary',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceNotice" TEXT,
    "announcementText" TEXT,
    "announcementLink" TEXT,
    "heroMovieSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "providerPriority" TEXT[] DEFAULT ARRAY['kkphim', 'ophim', 'nguonc', 'vsmov']::TEXT[],
    "autoSkipIntro" BOOLEAN NOT NULL DEFAULT false,
    "watchPartyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "site_configuration_pkey" PRIMARY KEY ("id")
);
