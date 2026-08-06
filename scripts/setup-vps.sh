#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# CineVerse VPS Setup Script
# Hỗ trợ: Ubuntu 22.04 / 24.04 LTS
# Chạy với: sudo bash setup-vps.sh
# ══════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Colors ─────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log()    { echo -e "${GREEN}[✓]${NC} $1"; }
info()   { echo -e "${BLUE}[ℹ]${NC} $1"; }
warn()   { echo -e "${YELLOW}[!]${NC} $1"; }
error()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
header() { echo -e "\n${CYAN}══ $1 ══${NC}"; }

# ── Kiểm tra root ─────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
   error "Script này phải chạy với sudo: sudo bash setup-vps.sh"
fi

header "CineVerse VPS Setup"
info "Bắt đầu cài đặt môi trường VPS..."

# ── Config (sửa nếu cần) ───────────────────────────────────────
DEPLOY_USER="deploy"
APP_DIR="/opt/cineverse"
GITHUB_REPO="${GITHUB_REPO:-}"  # Truyền qua env: GITHUB_REPO=user/repo sudo bash setup-vps.sh

# ── Yêu cầu GitHub repo ────────────────────────────────────────
if [[ -z "$GITHUB_REPO" ]]; then
    echo ""
    read -p "$(echo -e ${YELLOW})Nhập GitHub repo (VD: username/film-site): $(echo -e ${NC})" GITHUB_REPO
    if [[ -z "$GITHUB_REPO" ]]; then
        error "GitHub repo không được để trống!"
    fi
fi

header "Bước 1: Cập nhật hệ thống"
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    curl wget git \
    ca-certificates \
    gnupg lsb-release \
    ufw fail2ban \
    htop unzip
log "Cập nhật hệ thống hoàn tất"

header "Bước 2: Cài đặt Docker"
if command -v docker &> /dev/null; then
    warn "Docker đã được cài đặt: $(docker --version)"
else
    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
        gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Add Docker repo
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    log "Docker đã được cài đặt: $(docker --version)"
fi

header "Bước 3: Tạo user deploy"
if id "$DEPLOY_USER" &>/dev/null; then
    warn "User '$DEPLOY_USER' đã tồn tại"
else
    useradd -m -s /bin/bash "$DEPLOY_USER"
    usermod -aG docker "$DEPLOY_USER"
    usermod -aG sudo "$DEPLOY_USER"
    
    # Setup SSH key thừa kế từ root
    mkdir -p /home/$DEPLOY_USER/.ssh
    if [[ -f /root/.ssh/authorized_keys ]]; then
        cp /root/.ssh/authorized_keys /home/$DEPLOY_USER/.ssh/
        chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
        chmod 700 /home/$DEPLOY_USER/.ssh
        chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys
    fi
    log "User '$DEPLOY_USER' đã được tạo"
fi

header "Bước 4: Cấu hình Firewall (UFW)"
ufw --force reset > /dev/null 2>&1
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh        # Port 22
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
ufw --force enable
log "Firewall đã được cấu hình"

header "Bước 5: Clone repository"
mkdir -p "$APP_DIR"
chown -R $DEPLOY_USER:$DEPLOY_USER "$APP_DIR"

if [[ -d "$APP_DIR/.git" ]]; then
    warn "Repo đã tồn tại tại $APP_DIR, bỏ qua clone"
else
    info "Clone từ GitHub: $GITHUB_REPO"
    info "Nếu đây là private repo, cần GitHub Personal Access Token"
    sudo -u $DEPLOY_USER git clone "https://github.com/$GITHUB_REPO.git" "$APP_DIR"
    log "Clone repo hoàn tất"
fi

header "Bước 6: Cấu hình Environment Variables"
if [[ -f "$APP_DIR/.env" ]]; then
    warn ".env đã tồn tại, bỏ qua"
else
    if [[ -f "$APP_DIR/.env.vps.example" ]]; then
        cp "$APP_DIR/.env.vps.example" "$APP_DIR/.env"
        chown $DEPLOY_USER:$DEPLOY_USER "$APP_DIR/.env"
        chmod 600 "$APP_DIR/.env"
        
        # Tạo random JWT secrets
        JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
        JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
        POSTGRES_PASS=$(openssl rand -base64 32 | tr -d '\n/+=' | cut -c1-32)
        REDIS_PASS=$(openssl rand -base64 24 | tr -d '\n/+=' | cut -c1-24)
        
        # Thay thế placeholders
        sed -i "s/CHANGE_THIS_STRONG_PASSWORD/$POSTGRES_PASS/g" "$APP_DIR/.env"
        sed -i "s/CHANGE_THIS_REDIS_PASSWORD/$REDIS_PASS/g" "$APP_DIR/.env"
        sed -i "s/CHANGE_THIS_JWT_SECRET_64_CHARS_MIN/$JWT_SECRET/g" "$APP_DIR/.env"
        sed -i "s/CHANGE_THIS_REFRESH_SECRET_64_CHARS_MIN/$JWT_REFRESH_SECRET/g" "$APP_DIR/.env"
        
        log ".env đã được tạo với random secrets"
        warn "QUAN TRỌNG: Hãy chỉnh sửa $APP_DIR/.env để điền đúng:"
        echo "   - NEXT_PUBLIC_API_URL (URL của Cloudflare Tunnel hoặc domain của bạn)"
        echo "   - FRONTEND_URL"
        echo "   - TMDB_ACCESS_TOKEN (nếu chưa đúng)"
        echo ""
        echo -e "${YELLOW}Nhấn Enter sau khi bạn đã chỉnh sửa .env...${NC}"
        read -r
    else
        error "Không tìm thấy .env.vps.example trong $APP_DIR"
    fi
fi

header "Bước 7: Cài đặt Cloudflare Tunnel (cloudflared)"
if command -v cloudflared &> /dev/null; then
    warn "cloudflared đã được cài đặt"
else
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | \
        gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg
    echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] \
        https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | \
        tee /etc/apt/sources.list.d/cloudflared.list
    apt-get update -qq
    apt-get install -y -qq cloudflared
    log "cloudflared đã được cài đặt"
fi

info "Để tạo Cloudflare Tunnel, chạy lệnh sau với user deploy:"
echo ""
echo "   sudo -u $DEPLOY_USER cloudflared tunnel login"
echo "   sudo -u $DEPLOY_USER cloudflared tunnel create cineverse"
echo "   sudo -u $DEPLOY_USER cloudflared tunnel route dns cineverse YOUR_DOMAIN"
echo ""

header "Bước 8: Build Docker images"
info "Đây có thể mất 5-15 phút lần đầu..."
cd "$APP_DIR"
sudo -u $DEPLOY_USER docker compose build
log "Build Docker images hoàn tất"

header "Bước 9: Khởi động các services"
sudo -u $DEPLOY_USER docker compose up -d postgres redis
info "Đợi PostgreSQL và Redis khởi động..."
sleep 15

# Chạy Prisma migrations
info "Chạy Prisma migrations..."
sudo -u $DEPLOY_USER docker compose run --rm api sh -c "cd /app/apps/api && npx prisma migrate deploy"
log "Database migrations hoàn tất"

# Khởi động tất cả services
sudo -u $DEPLOY_USER docker compose up -d
log "Tất cả services đã được khởi động"

header "Bước 10: Kiểm tra trạng thái"
sleep 10
sudo -u $DEPLOY_USER docker compose ps
echo ""
sudo -u $DEPLOY_USER docker compose logs --tail=20

echo ""
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ CineVerse đã được deploy thành công!${NC}"
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo ""
echo -e "📁 App directory: ${CYAN}$APP_DIR${NC}"
echo -e "🐳 Xem logs: ${CYAN}cd $APP_DIR && docker compose logs -f${NC}"
echo -e "🔄 Update app: ${CYAN}cd $APP_DIR && bash scripts/deploy.sh${NC}"
echo ""
warn "Tiếp theo: Cấu hình Cloudflare Tunnel để có HTTPS"
echo "   Xem hướng dẫn trong: $APP_DIR/VPS_DEPLOY.md"

# ── Bước 11: Tạo SSH key cho GitLab CI/CD ─────────────────────
header "Bước 11: Tạo SSH key cho GitLab CI/CD (auto-deploy)"
GITLAB_KEY_PATH="/home/$DEPLOY_USER/.ssh/gitlab_ci_ed25519"

if [[ ! -f "$GITLAB_KEY_PATH" ]]; then
    sudo -u $DEPLOY_USER ssh-keygen \
        -t ed25519 \
        -C "gitlab-ci-deploy@cineverse" \
        -f "$GITLAB_KEY_PATH" \
        -N ""

    # Thêm public key vào authorized_keys
    sudo -u $DEPLOY_USER cat "${GITLAB_KEY_PATH}.pub" >> \
        "/home/$DEPLOY_USER/.ssh/authorized_keys"
    chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"

    log "SSH key đã được tạo"
else
    warn "SSH key đã tồn tại tại $GITLAB_KEY_PATH"
fi

echo ""
echo -e "${YELLOW}══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  📋 COPY private key này vào GitLab CI/CD Variables       ${NC}"
echo -e "${YELLOW}  GitLab → Project → Settings → CI/CD → Variables          ${NC}"
echo -e "${YELLOW}  Variable name: SSH_PRIVATE_KEY | Protected ✅ | Masked ✅${NC}"
echo -e "${YELLOW}══════════════════════════════════════════════════════════${NC}"
echo ""
cat "$GITLAB_KEY_PATH"
echo ""
echo -e "${YELLOW}══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Các variables cần thêm vào GitLab CI/CD:"
echo -e "  ${CYAN}SSH_PRIVATE_KEY${NC}  = (private key ở trên)"
echo -e "  ${CYAN}VPS_HOST${NC}         = $(hostname -I | awk '{print $1}')"
echo -e "  ${CYAN}VPS_USER${NC}         = $DEPLOY_USER"
echo -e "  ${CYAN}VPS_APP_DIR${NC}      = $APP_DIR"
echo -e "  ${CYAN}APP_URL${NC}          = https://yourdomain.com"

