#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# FlexPhim — Automated PostgreSQL Backup to Cloudflare R2
# ══════════════════════════════════════════════════════════════════
set -euo pipefail

# 1. Configuration
BACKUP_DIR="${BACKUP_DIR:-/root/db_backups}"
TIMESTAMP="$(date +'%Y-%m-%d_%H%M%S')"
BACKUP_FILE="${BACKUP_DIR}/flexphim_db_${TIMESTAMP}.sql.gz"
CONTAINER_NAME="${DB_CONTAINER:-netphim_postgres}"
DB_USER="${POSTGRES_USER:-netphim}"
DB_NAME="${POSTGRES_DB:-netphim}"

# Load credentials from environment files if available
if [ -f "/root/.env" ]; then
    set -a
    source "/root/.env" 2>/dev/null || true
    set +a
elif [ -f ".env" ]; then
    set -a
    source ".env" 2>/dev/null || true
    set +a
fi

# Cloudflare R2 Configuration
export RCLONE_CONFIG_R2_TYPE="s3"
export RCLONE_CONFIG_R2_PROVIDER="Cloudflare"
export RCLONE_CONFIG_R2_ACCESS_KEY_ID="${S3_ACCESS_KEY_ID:-${R2_ACCESS_KEY_ID:-}}"
export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="${S3_SECRET_ACCESS_KEY:-${R2_SECRET_ACCESS_KEY:-}}"
export RCLONE_CONFIG_R2_ENDPOINT="${S3_ENDPOINT:-https://${R2_ACCOUNT_ID:-762ecc77741adcab1119e8cece4da0a4}.r2.cloudflarestorage.com}"
R2_BUCKET="${S3_BUCKET:-flexphim-backup-user}"

# Telegram Alerting
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

notify_telegram() {
    local message="$1"
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=${message}" \
            -d "parse_mode=Markdown" > /dev/null 2>&1 || true
    fi
}

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting FlexPhim PostgreSQL backup..."

# 2. Dump PostgreSQL and gzip
if ! docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"; then
    echo "[$(date)] [ERROR] Failed to dump database!"
    notify_telegram "❌ *[FlexPhim Backup Alert]* Lỗi sao lưu database trên VPS! Không thể dump cơ sở dữ liệu."
    exit 1
fi

FILE_SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"
echo "[$(date)] Database dump successful: ${BACKUP_FILE} (${FILE_SIZE})"

# 3. Check or install rclone if needed
if ! command -v rclone &> /dev/null; then
    echo "[$(date)] Installing rclone..."
    apt-get update -qq && apt-get install -y -qq rclone > /dev/null 2>&1 || true
fi

# 4. Upload to Cloudflare R2
echo "[$(date)] Exporting clean user accounts list to JSON..."
USERS_BACKUP_FILE="${BACKUP_DIR}/users.json"
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c \
  "SELECT COALESCE(json_agg(u), '[]'::json) FROM (SELECT id, email, username, \"displayName\", role, \"isEmailVerified\", \"createdAt\" FROM users ORDER BY \"createdAt\" DESC) u;" > "$USERS_BACKUP_FILE" 2>/dev/null || true

echo "[$(date)] Uploading database and users list to Cloudflare R2 (bucket: ${R2_BUCKET})..."
if rclone copy "$BACKUP_FILE" "r2:${R2_BUCKET}/database/" && \
   ([ ! -f "$USERS_BACKUP_FILE" ] || rclone copy "$USERS_BACKUP_FILE" "r2:${R2_BUCKET}/users/"); then
    echo "[$(date)] Upload to Cloudflare R2 successful!"
    
    # 5. Clean up old backups on Cloudflare R2 (> 14 days)
    rclone delete "r2:${R2_BUCKET}/database/" --min-age 14d 2>/dev/null || true
    
    # Clean up local backups (> 7 days)
    find "$BACKUP_DIR" -type f -name "flexphim_db_*.sql.gz" -mtime +7 -delete 2>/dev/null || true
    
    notify_telegram "✅ *[FlexPhim Backup]* Sao lưu database lên Cloudflare R2 thành công!
• Dung lượng: \`${FILE_SIZE}\`
• File: \`flexphim_db_${TIMESTAMP}.sql.gz\`
• Bucket: \`${R2_BUCKET}\`"
else
    echo "[$(date)] [ERROR] Upload to Cloudflare R2 failed!"
    notify_telegram "⚠️ *[FlexPhim Backup Alert]* Dump database thành công nhưng lỗi upload lên Cloudflare R2!"
    exit 1
fi

echo "[$(date)] Backup process completed successfully."

