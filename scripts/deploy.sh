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

info "Validating required production configuration..."
compose config --quiet
log "Production configuration is complete"

# 2. Rebuild images
info "Rebuilding Docker images (chỉ rebuild service thay đổi)..."
compose build

# 3. Chạy migration từ image mới trước khi restart ứng dụng
info "Running Prisma migrations..."
compose run --rm --no-deps api sh -c 'cd /app/apps/api && DATABASE_URL="$DIRECT_DATABASE_URL" npx prisma migrate deploy'

# 4. Restart services sau khi schema đã sẵn sàng
info "Restarting services..."
compose up -d --no-deps --remove-orphans

# 5. Reload OpenResty để refresh upstream DNS (web/api có thể đổi IP sau deploy)
# nginx resolve upstream hostname một lần lúc startup - reload để cập nhật IP mới
info "Reloading OpenResty upstream DNS..."
if docker ps --filter name=netphim_openresty --filter status=running -q | grep -q .; then
    docker exec netphim_openresty openresty -s reload 2>/dev/null && log "OpenResty reloaded" || warn "OpenResty reload skipped (container not ready yet)"
else
    warn "OpenResty container not running, skipping reload"
fi

# 6. Xóa old images
info "Cleaning up old Docker images..."
docker image prune -f

# 6. Status
echo ""
compose ps
log "Deploy hoàn tất!"
echo ""
echo -e "🌐 Xem logs: ${CYAN}pnpm docker:logs${NC}"
echo -e "🔍 API logs: ${CYAN}docker compose --project-directory . -f infra/docker/docker-compose.yml logs -f api${NC}"
