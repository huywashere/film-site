#!/bin/bash
# ══════════════════════════════════════════════════════════════
# FlexPhim — Quick Deploy / Update Script
# Chạy khi có code mới cần deploy lên VPS
# Sử dụng: bash scripts/deploy.sh
# ══════════════════════════════════════════════════════════════

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${BLUE}[ℹ]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

COMPOSE_FILE="$APP_DIR/infra/docker/docker-compose.yml"
compose() {
    docker compose --project-directory "$APP_DIR" -f "$COMPOSE_FILE" "$@"
}

echo -e "${CYAN}══ FlexPhim Deploy ══${NC}"
info "Working dir: $APP_DIR"

# 1. Pull latest code
info "Pulling latest code from GitHub..."
git pull origin main
log "Code updated"

# 2. Rebuild images
info "Rebuilding Docker images (chỉ rebuild service thay đổi)..."
compose build

# 3. Restart services với zero-downtime (rotate)
info "Restarting services..."
compose up -d --no-deps --remove-orphans

# 4. Chạy migrations nếu có
info "Running Prisma migrations..."
compose exec api sh -c "cd /app/apps/api && npx prisma migrate deploy" || \
    warn "Migration failed hoặc không có migration mới"

# 5. Xóa old images
info "Cleaning up old Docker images..."
docker image prune -f

# 6. Status
echo ""
compose ps
log "Deploy hoàn tất!"
echo ""
echo -e "🌐 Xem logs: ${CYAN}pnpm docker:logs${NC}"
echo -e "🔍 API logs: ${CYAN}docker compose --project-directory . -f infra/docker/docker-compose.yml logs -f api${NC}"
