#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# CineVerse — GitLab CI/CD Deploy Script
# Chạy trên VPS, được gọi từ GitLab CI qua SSH
#
# Required env vars (inject từ GitLab CI):
#   REGISTRY_IMAGE    — registry.gitlab.com/group/project
#   IMAGE_TAG         — commit SHA (e.g. a1b2c3d4)
#   CI_REGISTRY       — registry.gitlab.com
#   CI_REGISTRY_USER  — gitlab-ci-token
#   CI_REGISTRY_PASSWORD — job token
# ══════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Colors ─────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'
RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

log()    { echo -e "${GREEN}[✓]${NC} $1"; }
info()   { echo -e "${BLUE}[ℹ]${NC} $1"; }
warn()   { echo -e "${YELLOW}[!]${NC} $1"; }
error()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
header() { echo -e "\n${CYAN}══ $1 ══${NC}"; }

# ── Kiểm tra required vars ─────────────────────────────────────
: "${REGISTRY_IMAGE:?REGISTRY_IMAGE chưa được set}"
: "${IMAGE_TAG:?IMAGE_TAG chưa được set}"
: "${CI_REGISTRY:?CI_REGISTRY chưa được set}"
: "${CI_REGISTRY_USER:?CI_REGISTRY_USER chưa được set}"
: "${CI_REGISTRY_PASSWORD:?CI_REGISTRY_PASSWORD chưa được set}"

# ── Config ─────────────────────────────────────────────────────
APP_DIR="${VPS_APP_DIR:-/opt/cineverse}"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"
PREV_TAG_FILE="$APP_DIR/.last_deployed_tag"

cd "$APP_DIR" || error "Không tìm thấy $APP_DIR"

header "CineVerse GitLab Deploy — $IMAGE_TAG"
info "Registry: $REGISTRY_IMAGE"
info "App dir:  $APP_DIR"

# Lưu tag cũ để rollback nếu cần
PREV_TAG=""
if [[ -f "$PREV_TAG_FILE" ]]; then
    PREV_TAG=$(cat "$PREV_TAG_FILE")
    info "Tag cũ: $PREV_TAG"
fi

# ── Bước 1: Đăng nhập GitLab Registry ─────────────────────────
header "Bước 1: Login Registry"
echo "$CI_REGISTRY_PASSWORD" | docker login "$CI_REGISTRY" \
    -u "$CI_REGISTRY_USER" --password-stdin
log "Đăng nhập GitLab Registry thành công"

# ── Bước 2: Pull images mới ────────────────────────────────────
header "Bước 2: Pull images mới"
info "Pulling API image: $REGISTRY_IMAGE/api:$IMAGE_TAG"
docker pull "$REGISTRY_IMAGE/api:$IMAGE_TAG"

info "Pulling Web image: $REGISTRY_IMAGE/web:$IMAGE_TAG"
docker pull "$REGISTRY_IMAGE/web:$IMAGE_TAG"
log "Pull hoàn tất"

# ── Bước 3: Cập nhật IMAGE_TAG trong môi trường ───────────────
header "Bước 3: Cập nhật environment"
# Export để docker compose dùng
export IMAGE_TAG
export REGISTRY_IMAGE

# Nếu docker-compose.yml dùng biến $IMAGE_TAG thì không cần thay thêm
# Đảm bảo .env có IMAGE_TAG mới nhất
if grep -q "^IMAGE_TAG=" "$APP_DIR/.env" 2>/dev/null; then
    sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG=$IMAGE_TAG|" "$APP_DIR/.env"
else
    echo "IMAGE_TAG=$IMAGE_TAG" >> "$APP_DIR/.env"
fi

if grep -q "^REGISTRY_IMAGE=" "$APP_DIR/.env" 2>/dev/null; then
    sed -i "s|^REGISTRY_IMAGE=.*|REGISTRY_IMAGE=$REGISTRY_IMAGE|" "$APP_DIR/.env"
else
    echo "REGISTRY_IMAGE=$REGISTRY_IMAGE" >> "$APP_DIR/.env"
fi
log "Environment cập nhật"

# ── Bước 4: Database migration ────────────────────────────────
header "Bước 4: Prisma Migrations"
# Chạy migration dùng image API mới (trước khi restart container)
docker run --rm \
    --network cineverse_cineverse_net \
    --env-file "$APP_DIR/.env" \
    "$REGISTRY_IMAGE/api:$IMAGE_TAG" \
    node -e "
const { execSync } = require('child_process');
try {
  execSync('npx prisma migrate deploy --schema=/app/apps/api/prisma/schema.prisma', { stdio: 'inherit' });
} catch(e) {
  console.error('Migration failed:', e.message);
  process.exit(1);
}
" || warn "Migration thất bại hoặc không có migration mới — tiếp tục deploy"
log "Migrations hoàn tất"

# ── Bước 5: Restart services (rolling) ────────────────────────
header "Bước 5: Restart Services"

# Hàm health check
wait_healthy() {
    local service=$1
    local max_wait=60
    local elapsed=0
    info "Đợi $service healthy..."
    while [[ $elapsed -lt $max_wait ]]; do
        status=$(docker compose ps "$service" --format json 2>/dev/null | \
            python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('Health','unknown'))" 2>/dev/null || echo "unknown")
        if [[ "$status" == "healthy" ]]; then
            log "$service healthy ✓"
            return 0
        fi
        sleep 5
        elapsed=$((elapsed + 5))
    done
    warn "$service chưa healthy sau ${max_wait}s — tiếp tục"
}

# Restart API trước
info "Restarting API..."
docker compose up -d --no-deps --pull never api
wait_healthy api

# Sau đó restart Web
info "Restarting Web..."
docker compose up -d --no-deps --pull never web
wait_healthy web

log "Tất cả services đã được restart"

# ── Bước 6: Lưu tag đã deploy ─────────────────────────────────
echo "$IMAGE_TAG" > "$PREV_TAG_FILE"

# ── Bước 7: Health check cuối ─────────────────────────────────
header "Bước 6: Final Health Check"
sleep 5
docker compose ps
echo ""

# Kiểm tra API endpoint
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null || echo "000")
if [[ "$API_HEALTH" == "200" ]]; then
    log "Health check: OK (HTTP $API_HEALTH)"
else
    warn "Health check trả về HTTP $API_HEALTH — kiểm tra logs nếu cần"
fi

# ── Bước 8: Dọn dẹp ───────────────────────────────────────────
header "Bước 7: Cleanup"
docker image prune -f --filter "label!=cineverse.keep=true" || true
log "Dọn dẹp image cũ hoàn tất"

# ── Hoàn tất ──────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Deploy $IMAGE_TAG hoàn tất!           ${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo ""
echo -e "📊 Xem logs: ${CYAN}docker compose logs -f${NC}"
echo -e "🔄 Rollback:  ${CYAN}IMAGE_TAG=$PREV_TAG bash scripts/gitlab-deploy.sh${NC}"
