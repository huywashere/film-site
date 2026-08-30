#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# NetPhim — GitLab CI/CD Deploy Script
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
APP_DIR="${VPS_APP_DIR:-/opt/netphim}"
COMPOSE_FILE="$APP_DIR/infra/docker/docker-compose.yml"
PREV_TAG_FILE="$APP_DIR/.last_deployed_tag"

compose() {
    docker compose --project-directory "$APP_DIR" -f "$COMPOSE_FILE" "$@"
}

cd "$APP_DIR" || error "Không tìm thấy $APP_DIR"

header "NetPhim GitLab Deploy — $IMAGE_TAG"
info "Registry: $REGISTRY_IMAGE"
info "App dir:  $APP_DIR"

# Compose and edge configuration are versioned with the application.
git fetch origin main
git checkout main
git pull --ff-only origin main

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

info "Pulling media gateway image: $REGISTRY_IMAGE/media-gateway:$IMAGE_TAG"
docker pull "$REGISTRY_IMAGE/media-gateway:$IMAGE_TAG"

info "Pulling Rust media worker image: $REGISTRY_IMAGE/media-worker-rs:$IMAGE_TAG"
docker pull "$REGISTRY_IMAGE/media-worker-rs:$IMAGE_TAG"

info "Pulling OpenResty image: $REGISTRY_IMAGE/openresty:$IMAGE_TAG"
docker pull "$REGISTRY_IMAGE/openresty:$IMAGE_TAG"
log "Pull hoàn tất"

# ── Bước 3: Cập nhật IMAGE_TAG trong môi trường ───────────────
header "Bước 3: Cập nhật environment"
# Export để compose dùng
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
    --network netphim_netphim_net \
    --env-file "$APP_DIR/.env" \
    "$REGISTRY_IMAGE/api:$IMAGE_TAG" \
    /app/apps/api/node_modules/.bin/prisma migrate deploy \
    --schema=/app/apps/api/prisma/schema.prisma \
    || error "Migration thất bại — dừng deploy để tránh chạy code với schema cũ"
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
        status=$(compose ps "$service" --format json 2>/dev/null | \
            python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('Health','unknown'))" 2>/dev/null || echo "unknown")
        if [[ "$status" == "healthy" ]]; then
            log "$service healthy ✓"
            return 0
        fi
        sleep 5
        elapsed=$((elapsed + 5))
    done
    warn "$service chưa healthy sau ${max_wait}s"
    return 1
}

rollback_services() {
    if [[ -z "$PREV_TAG" ]]; then
        error "Deploy lỗi và chưa có tag trước đó để rollback"
    fi

    warn "Rolling back API và Web về $PREV_TAG..."
    export IMAGE_TAG="$PREV_TAG"
    compose up -d --no-deps --pull never api web media-gateway media-worker-rs openresty || true
    echo "$PREV_TAG" > "$PREV_TAG_FILE"
    error "Deploy $1 thất bại; đã yêu cầu rollback về $PREV_TAG"
}

# Restart API trước
info "Restarting API..."
compose up -d --no-deps --pull never api
wait_healthy api || rollback_services "$IMAGE_TAG"

# Sau đó restart Web
info "Restarting Web..."
compose up -d --no-deps --pull never web
wait_healthy web || rollback_services "$IMAGE_TAG"

log "Tất cả services đã được restart"

info "Restarting media gateway, Rust analyzer and OpenResty edge..."
# Meilisearch is an external pinned image and a disposable derived index. Start
# it independently; the media gateway still falls back to provider search if it
# is temporarily unavailable during rollout.
compose up -d meilisearch
compose up -d --no-deps --pull never media-gateway media-worker-rs openresty
wait_healthy media-gateway || rollback_services "$IMAGE_TAG"
wait_healthy media-worker-rs || rollback_services "$IMAGE_TAG"
wait_healthy openresty || rollback_services "$IMAGE_TAG"

# ── Bước 6: Lưu tag đã deploy ─────────────────────────────────
echo "$IMAGE_TAG" > "$PREV_TAG_FILE"

# ── Bước 7: Health check cuối ─────────────────────────────────
header "Bước 6: Final Health Check"
sleep 5
compose ps
echo ""

# Kiểm tra riêng API thật và Web, không dùng endpoint tĩnh của Nginx.
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/v1/health 2>/dev/null || echo "000")
WEB_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")
if [[ "$API_HEALTH" != "200" || "$WEB_HEALTH" != "200" ]]; then
    rollback_services "$IMAGE_TAG"
fi
log "Health check: API $API_HEALTH, Web $WEB_HEALTH"

# ── Bước 8: Dọn dẹp ───────────────────────────────────────────
header "Bước 7: Cleanup"
docker image prune -f --filter "label!=netphim.keep=true" || true
log "Dọn dẹp image cũ hoàn tất"

# ── Hoàn tất ──────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Deploy $IMAGE_TAG hoàn tất!           ${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo ""
echo -e "📊 Xem logs: ${CYAN}docker compose --project-directory $APP_DIR -f $COMPOSE_FILE logs -f${NC}"
echo -e "🔄 Rollback:  ${CYAN}IMAGE_TAG=$PREV_TAG bash scripts/gitlab-deploy.sh${NC}"
