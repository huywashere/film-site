-- ── CreateEnum: notification_type
CREATE TYPE "notification_type" AS ENUM (
  'NEW_EPISODE',
  'REVIEW_LIKED',
  'NEW_FOLLOWER',
  'SYSTEM_ANNOUNCE',
  'REVIEW_REPLY',
  'MOVIE_AVAILABLE'
);

-- ── CreateTable: user_notifications
CREATE TABLE "user_notifications" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "type"      "notification_type" NOT NULL,
  "title"     TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "link"      TEXT,
  "imageUrl"  TEXT,
  "isRead"    BOOLEAN NOT NULL DEFAULT false,
  "readAt"    TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "user_notifications_userId_isRead_createdAt_idx" ON "user_notifications"("userId", "isRead", "createdAt" DESC);
CREATE INDEX "user_notifications_userId_createdAt_idx"        ON "user_notifications"("userId", "createdAt" DESC);
CREATE INDEX "user_notifications_createdAt_expiresAt_idx"     ON "user_notifications"("createdAt", "expiresAt");
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── CreateTable: movie_subscriptions
CREATE TABLE "movie_subscriptions" (
  "userId"      TEXT NOT NULL,
  "movieId"     TEXT NOT NULL,
  "notifyEmail" BOOLEAN NOT NULL DEFAULT false,
  "notifyPush"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "movie_subscriptions_pkey" PRIMARY KEY ("userId", "movieId")
);
CREATE INDEX "movie_subscriptions_movieId_idx" ON "movie_subscriptions"("movieId");
ALTER TABLE "movie_subscriptions" ADD CONSTRAINT "movie_subscriptions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "movie_subscriptions" ADD CONSTRAINT "movie_subscriptions_movieId_fkey"
  FOREIGN KEY ("movieId") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── CreateTable: user_preferences
CREATE TABLE "user_preferences" (
  "userId"             TEXT NOT NULL,
  "defaultQuality"     TEXT NOT NULL DEFAULT 'auto',
  "defaultSubtitle"    TEXT NOT NULL DEFAULT 'vi',
  "autoplay"           BOOLEAN NOT NULL DEFAULT true,
  "autoSkipIntro"      BOOLEAN NOT NULL DEFAULT false,
  "autoSkipOutro"      BOOLEAN NOT NULL DEFAULT false,
  "preferredServer"    TEXT,
  "preferredProvider"  TEXT,
  "theme"              TEXT NOT NULL DEFAULT 'dark',
  "language"           TEXT NOT NULL DEFAULT 'vi',
  "contentLanguage"    TEXT NOT NULL DEFAULT 'all',
  "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
  "pushNotifications"  BOOLEAN NOT NULL DEFAULT true,
  "notifyNewEpisode"   BOOLEAN NOT NULL DEFAULT true,
  "notifyReviewLiked"  BOOLEAN NOT NULL DEFAULT true,
  "notifyNewFollower"  BOOLEAN NOT NULL DEFAULT true,
  "contentFilter"      TEXT NOT NULL DEFAULT 'all',
  "updatedAt"          TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── CreateTable: playlists
CREATE TABLE "playlists" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "coverUrl"    TEXT,
  "isPublic"    BOOLEAN NOT NULL DEFAULT false,
  "itemCount"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "playlists_userId_updatedAt_idx"   ON "playlists"("userId", "updatedAt" DESC);
CREATE INDEX "playlists_isPublic_updatedAt_idx" ON "playlists"("isPublic", "updatedAt" DESC);
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── CreateTable: playlist_items
CREATE TABLE "playlist_items" (
  "id"         TEXT NOT NULL,
  "playlistId" TEXT NOT NULL,
  "movieId"    TEXT NOT NULL,
  "note"       TEXT,
  "position"   INTEGER NOT NULL DEFAULT 0,
  "addedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "playlist_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "playlist_items_playlistId_movieId_key" ON "playlist_items"("playlistId", "movieId");
CREATE INDEX "playlist_items_playlistId_position_idx" ON "playlist_items"("playlistId", "position");
ALTER TABLE "playlist_items" ADD CONSTRAINT "playlist_items_playlistId_fkey"
  FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "playlist_items" ADD CONSTRAINT "playlist_items_movieId_fkey"
  FOREIGN KEY ("movieId") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
