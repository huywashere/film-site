-- The original security migration only altered audit_logs when the table had
-- already been created manually. Establish the missing baseline so a clean
-- database can apply the complete migration chain.
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "adminEmail" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetId" TEXT,
  "details" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "audit_logs_adminId_idx"
  ON "audit_logs" ("adminId");

CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx"
  ON "audit_logs" ("createdAt" DESC);
