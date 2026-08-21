ALTER TABLE "users" ADD COLUMN "githubId" TEXT;

CREATE UNIQUE INDEX "users_githubId_key" ON "users"("githubId");
