-- Several early development databases received these models through
-- `prisma db push`, so no migration originally created them. This idempotent
-- baseline makes the repository migration chain work on a clean database.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ad_type') THEN
    CREATE TYPE "ad_type" AS ENUM (
      'BANNER_TOP',
      'BANNER_BOTTOM',
      'BANNER_PLAYER',
      'VIDEO_PREROLL',
      'POPUNDER',
      'CUSTOM_HTML'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "two_factor_auths" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "backupCodes" TEXT[] NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "two_factor_auths_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "two_factor_auths_userId_key"
  ON "two_factor_auths" ("userId");

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "isRevoked" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "refresh_tokens_userId_idx"
  ON "refresh_tokens" ("userId");

CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "verification_tokens_userId_idx"
  ON "verification_tokens" ("userId");

CREATE TABLE IF NOT EXISTS "reset_password_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reset_password_tokens_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "reset_password_tokens_userId_idx"
  ON "reset_password_tokens" ("userId");

CREATE TABLE IF NOT EXISTS "system_notifications" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "tag" TEXT DEFAULT 'Hệ thống',
  "link" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "system_notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "system_notifications_isActive_priority_createdAt_idx"
  ON "system_notifications" ("isActive", "priority" DESC, "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "watch_histories" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "movieId" TEXT NOT NULL,
  "movieTitle" TEXT NOT NULL,
  "movieThumb" TEXT,
  "episode" TEXT,
  "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "serverName" TEXT,
  "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "watch_histories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "watch_histories_userId_movieId_episode_key"
  ON "watch_histories" ("userId", "movieId", "episode");

CREATE TABLE IF NOT EXISTS "ip_block_rules" (
  "id" TEXT NOT NULL,
  "ipAddress" TEXT NOT NULL,
  "reason" TEXT,
  "blockedBy" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ip_block_rules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ip_block_rules_ipAddress_key"
  ON "ip_block_rules" ("ipAddress");
CREATE INDEX IF NOT EXISTS "ip_block_rules_expiresAt_createdAt_idx"
  ON "ip_block_rules" ("expiresAt", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "ad_placements" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" "ad_type" NOT NULL,
  "imageUrl" TEXT,
  "targetUrl" TEXT,
  "htmlContent" TEXT,
  "videoVastUrl" TEXT,
  "videoDuration" INTEGER DEFAULT 15,
  "skipOffsetSec" INTEGER DEFAULT 5,
  "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ad_placements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ad_placements_type_isActive_idx"
  ON "ad_placements" ("type", "isActive");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'two_factor_auths_userId_fkey') THEN
    ALTER TABLE "two_factor_auths" ADD CONSTRAINT "two_factor_auths_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refresh_tokens_userId_fkey') THEN
    ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'verification_tokens_userId_fkey') THEN
    ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reset_password_tokens_userId_fkey') THEN
    ALTER TABLE "reset_password_tokens" ADD CONSTRAINT "reset_password_tokens_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'watch_histories_userId_fkey') THEN
    ALTER TABLE "watch_histories" ADD CONSTRAINT "watch_histories_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'watch_histories_movieId_fkey') THEN
    ALTER TABLE "watch_histories" ADD CONSTRAINT "watch_histories_movieId_fkey"
      FOREIGN KEY ("movieId") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
