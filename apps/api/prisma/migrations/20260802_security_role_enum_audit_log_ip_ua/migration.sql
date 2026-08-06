-- Migration: security_role_enum_audit_log_ip_ua
-- Fix #14: Thêm enum Role cho cột role trong bảng users (type-safe thay vì String)
-- Fix #11: Thêm ipAddress và userAgent vào bảng audit_logs
--
-- NOTE: Migration này dùng IF EXISTS/DO blocks để an toàn trên mọi trạng thái DB.
-- Sẽ được chạy lại như 1 phần của `prisma db push` hoặc migration mới sau khi
-- tất cả các migration cũ đã được apply đầy đủ.

-- ── Tạo enum type (nếu chưa tồn tại) ────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN
    CREATE TYPE "role" AS ENUM ('USER', 'ADMIN', 'MODERATOR');
  END IF;
END$$;

-- ── Thêm cột role dạng enum vào bảng users (nếu bảng tồn tại) ───
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'users'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
      -- Cột chưa tồn tại → thêm mới với kiểu enum
      ALTER TABLE "users"
        ADD COLUMN "role" "role" NOT NULL DEFAULT 'USER'::"role";
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'role' AND data_type = 'text'
    ) THEN
      -- Cột tồn tại dạng TEXT → convert sang enum
      ALTER TABLE "users"
        ALTER COLUMN "role" TYPE "role" USING (
          CASE "role"
            WHEN 'ADMIN' THEN 'ADMIN'::"role"
            WHEN 'MODERATOR' THEN 'MODERATOR'::"role"
            ELSE 'USER'::"role"
          END
        );
      ALTER TABLE "users"
        ALTER COLUMN "role" SET DEFAULT 'USER'::"role";
    END IF;
  END IF;
END$$;

-- ── Fix #11: Thêm cột forensics vào audit_logs (nếu bảng tồn tại) ──
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'audit_logs' AND column_name = 'ipAddress'
    ) THEN
      ALTER TABLE "audit_logs" ADD COLUMN "ipAddress" TEXT;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'audit_logs' AND column_name = 'userAgent'
    ) THEN
      ALTER TABLE "audit_logs" ADD COLUMN "userAgent" TEXT;
    END IF;
  END IF;
END$$;
