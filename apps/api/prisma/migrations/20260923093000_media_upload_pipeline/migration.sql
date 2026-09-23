CREATE TYPE "media_upload_status" AS ENUM (
  'QUEUED',
  'PROCESSING',
  'COMPLETED',
  'FAILED'
);

CREATE TABLE "media_upload_jobs" (
  "id" TEXT NOT NULL,
  "movieId" TEXT NOT NULL,
  "episodeKey" TEXT NOT NULL DEFAULT 'full',
  "episodeName" TEXT,
  "serverName" TEXT NOT NULL DEFAULT 'FlexPhim',
  "status" "media_upload_status" NOT NULL DEFAULT 'QUEUED',
  "sourcePath" TEXT NOT NULL,
  "outputKey" TEXT,
  "manifestUrl" TEXT,
  "durationSeconds" INTEGER,
  "sourceWidth" INTEGER,
  "sourceHeight" INTEGER,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "requestedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "media_upload_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "media_upload_jobs_status_createdAt_idx"
  ON "media_upload_jobs" ("status", "createdAt");
CREATE INDEX "media_upload_jobs_movieId_createdAt_idx"
  ON "media_upload_jobs" ("movieId", "createdAt" DESC);

ALTER TABLE "media_upload_jobs"
  ADD CONSTRAINT "media_upload_jobs_movieId_fkey"
  FOREIGN KEY ("movieId") REFERENCES "movies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
