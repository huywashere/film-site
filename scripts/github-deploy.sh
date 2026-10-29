#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# FlexPhim — GitHub Actions CI/CD Deploy Script
# Chạy trên VPS, được gọi từ GitHub Actions qua SSH
#
# Required env vars (truyền từ GitHub Actions):
#   REGISTRY_IMAGE       — ghcr.io/username/repo
#   IMAGE_TAG            — commit SHA (e.g. 7b3a1f4) hoặc latest
#   CI_REGISTRY          — ghcr.io (mặc định)
#   CI_REGISTRY_USER     — GitHub username hoặc actor
#   CI_REGISTRY_PASSWORD — GITHUB_TOKEN hoặc GitHub Personal Access Token (PAT)
#   VPS_APP_DIR          — Thư mục dự án trên VPS (mặc định: /root/netphim)
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

# ── Environment Defaults ───────────────────────────────────────
CI_REGISTRY="${CI_REGISTRY:-ghcr.io}"
APP_DIR="${VPS_APP_DIR:-/root/flexphim}"
if [[ ! -d "$APP_DIR" || ! -f "$APP_DIR/infra/docker/docker-compose.yml" ]]; then
    for cand in "/root/flexphim" "$HOME/flexphim" "/root/netphim" "$HOME/netphim" "/opt/flexphim" "/opt/netphim"; do
        if [[ -d "$cand" && -f "$cand/infra/docker/docker-compose.yml" ]]; then
            APP_DIR="$cand"
            break
        fi
    done
fi

: "${REGISTRY_IMAGE:?REGISTRY_IMAGE chưa được set (VD: ghcr.io/huywashere/film-site)}"
: "${IMAGE_TAG:?IMAGE_TAG chưa được set}"
: "${CI_REGISTRY_USER:?CI_REGISTRY_USER chưa được set}"
: "${CI_REGISTRY_PASSWORD:?CI_REGISTRY_PASSWORD chưa được set}"

COMPOSE_FILE="$APP_DIR/infra/docker/docker-compose.yml"
PREV_TAG_FILE="$APP_DIR/.last_deployed_tag"

compose() {
    docker compose --project-directory "$APP_DIR" -f "$COMPOSE_FILE" "$@"
}

cd "$APP_DIR" || error "Không tìm thấy thư mục $APP_DIR"

header "FlexPhim GitHub Deploy — $IMAGE_TAG"
info "Registry: $REGISTRY_IMAGE"
info "App dir:  $APP_DIR"

# ── Đồng bộ Git config & files mới nhất ──────────────────────
header "Bước 1: Cập nhật mã nguồn cấu hình"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git fetch origin main || warn "Không thể fetch origin main, sử dụng file hiện tại"
    git checkout -f main 2>/dev/null || true
    git reset --hard origin/main || git pull --ff-only origin main || warn "Git pull không thể ff-only, giữ nguyên file local"
fi

if [[ -f "$APP_DIR/.env" ]] && ! grep -q "^TYPESENSE_API_KEY=" "$APP_DIR/.env"; then
    info "Khởi tạo TYPESENSE_API_KEY cho production .env..."
    echo "TYPESENSE_API_KEY=$(openssl rand -hex 24 2>/dev/null || echo flexphim-typesense-api-key-2026)" >> "$APP_DIR/.env"
fi

info "Kiểm tra cấu hình .env sản xuất..."
compose config --quiet || error "Production .env thiếu biến bắt buộc hoặc compose config không hợp lệ"

# Lưu tag cũ để rollback
PREV_TAG=""
if [[ -f "$PREV_TAG_FILE" ]]; then
    PREV_TAG=$(cat "$PREV_TAG_FILE")
    info "Tag trước đó: $PREV_TAG"
fi

# ── Bước 2: Đăng nhập GitHub Container Registry ────────────────
header "Bước 2: Login GHCR"
echo "$CI_REGISTRY_PASSWORD" | docker login "$CI_REGISTRY" \
    -u "$CI_REGISTRY_USER" --password-stdin
log "Đăng nhập $CI_REGISTRY thành công"

# Chuyển REGISTRY_IMAGE về lowercase (GHCR yêu cầu lowercase)
REGISTRY_IMAGE_LOWER=$(echo "$REGISTRY_IMAGE" | tr '[:upper:]' '[:lower:]')

# ── Bước 3: Pull images mới ────────────────────────────────────
header "Bước 3: Pull images mới từ GHCR"
info "Pulling API: $REGISTRY_IMAGE_LOWER/api:$IMAGE_TAG"
docker pull "$REGISTRY_IMAGE_LOWER/api:$IMAGE_TAG"

info "Pulling Web: $REGISTRY_IMAGE_LOWER/web:$IMAGE_TAG"
docker pull "$REGISTRY_IMAGE_LOWER/web:$IMAGE_TAG"

info "Pulling Admin: $REGISTRY_IMAGE_LOWER/admin:$IMAGE_TAG"
docker pull "$REGISTRY_IMAGE_LOWER/admin:$IMAGE_TAG" || warn "Admin image chưa sẵn sàng trên GHCR"

info "Pulling Media Gateway: $REGISTRY_IMAGE_LOWER/media-gateway:$IMAGE_TAG"
docker pull "$REGISTRY_IMAGE_LOWER/media-gateway:$IMAGE_TAG"

info "Pulling Media Worker: $REGISTRY_IMAGE_LOWER/media-worker-rs:$IMAGE_TAG"
docker pull "$REGISTRY_IMAGE_LOWER/media-worker-rs:$IMAGE_TAG"

info "Pulling OpenResty: $REGISTRY_IMAGE_LOWER/openresty:$IMAGE_TAG"
docker pull "$REGISTRY_IMAGE_LOWER/openresty:$IMAGE_TAG"
log "Pull tất cả images hoàn tất"

# ── Bước 4: Cập nhật IMAGE_TAG trong môi trường ───────────────
header "Bước 4: Cập nhật environment"
export IMAGE_TAG
export REGISTRY_IMAGE="$REGISTRY_IMAGE_LOWER"

if grep -q "^IMAGE_TAG=" "$APP_DIR/.env" 2>/dev/null; then
    sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG=$IMAGE_TAG|" "$APP_DIR/.env"
else
    echo "IMAGE_TAG=$IMAGE_TAG" >> "$APP_DIR/.env"
fi

if grep -q "^REGISTRY_IMAGE=" "$APP_DIR/.env" 2>/dev/null; then
    sed -i "s|^REGISTRY_IMAGE=.*|REGISTRY_IMAGE=$REGISTRY_IMAGE_LOWER|" "$APP_DIR/.env"
else
    echo "REGISTRY_IMAGE=$REGISTRY_IMAGE_LOWER" >> "$APP_DIR/.env"
fi
log "Environment cập nhật thành công (IMAGE_TAG=$IMAGE_TAG)"

# ── Helper functions ──────────────────────────────────────────
wait_healthy() {
    local service=$1
    local max_wait=90
    local elapsed=0
    info "Đợi $service đạt trạng thái healthy..."
    while [[ $elapsed -lt $max_wait ]]; do
        status=$(compose ps "$service" --format json 2>/dev/null | \
            grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
        
        if [[ "$status" == "healthy" ]]; then
            log "$service healthy ✓"
            return 0
        fi
        sleep 5
        elapsed=$((elapsed + 5))
    done
    warn "$service chưa healthy sau ${max_wait}s (status: $status)"
    return 1
}

rollback_services() {
    if [[ -z "$PREV_TAG" ]]; then
        error "Deploy lỗi và chưa có tag trước đó để rollback"
    fi

    warn "Khôi phục lại phiên bản trước: $PREV_TAG..."
    export IMAGE_TAG="$PREV_TAG"
    compose up -d --no-deps --pull never api web media-gateway media-worker-rs openresty || true
    echo "$PREV_TAG" > "$PREV_TAG_FILE"
    error "Deploy thất bại; đã rollback về $PREV_TAG"
}

# ── Bước 5: Khởi động dịch vụ nền ─────────────────────────────
header "Bước 5: Khởi động dịch vụ nền"
info "Khởi động postgres, pgbouncer, redis, rabbitmq, typesense, recommendation-engine..."
compose up -d --remove-orphans postgres pgbouncer redis rabbitmq typesense recommendation-engine
wait_healthy postgres || error "PostgreSQL không đạt trạng thái healthy"

# Giải phóng bất kỳ advisory lock tồn đọng từ lần chạy trước nếu có
compose exec -T postgres psql -U "${POSTGRES_USER:-netphim}" -d "${POSTGRES_DB:-netphim_db}" -c "SELECT pg_advisory_unlock_all();" 2>/dev/null || true

# ── Bước 6: Database migration ────────────────────────────────
header "Bước 6: Prisma Migrations"
info "Chạy Prisma migrate deploy trực tiếp qua PostgreSQL port 5432..."
compose run --rm --no-deps -e DATABASE_URL="postgresql://${POSTGRES_USER:-netphim}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-netphim_db}?schema=public" api sh -c \
    'cd /app/apps/api && npx prisma migrate deploy' \
    || error "Migration thất bại — dừng deploy để bảo vệ dữ liệu"
log "Migrations hoàn tất"

# ── Bước 7: Khởi động application services (rolling update) ────
header "Bước 7: Khởi động application services"

# Restart API trước
info "Khởi động container API mới..."
compose up -d --no-deps --pull never api
wait_healthy api || rollback_services "$IMAGE_TAG"

# Sau đó restart Web
info "Khởi động container Web mới..."
compose up -d --no-deps --pull never web
wait_healthy web || rollback_services "$IMAGE_TAG"

# Khởi động các service còn lại
info "Khởi động media-gateway, worker, openresty, admin, cloudflared..."
docker rm -f netphim_cloudflared 2>/dev/null || true
compose up -d --force-recreate --no-deps --pull never media-gateway media-worker-rs openresty admin cloudflared
wait_healthy media-gateway || rollback_services "$IMAGE_TAG"
wait_healthy openresty || rollback_services "$IMAGE_TAG"
wait_healthy admin || warn "Admin container chưa đạt trạng thái healthy"

# ── Bước 8: Lưu tag đã deploy ─────────────────────────────────
echo "$IMAGE_TAG" > "$PREV_TAG_FILE"

# ── Bước 9: Dọn dẹp Docker images cũ ──────────────────────────
header "Bước 8: Cleanup"
docker image prune -f --filter "label!=netphim.keep=true" || true
log "Dọn dẹp image cũ hoàn tất"

# ── Hoàn tất ──────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Deploy $IMAGE_TAG thành công!        ${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo ""
compose ps
