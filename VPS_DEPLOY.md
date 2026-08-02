# 🚀 Hướng dẫn Deploy CineVerse lên VPS

## Tổng quan kiến trúc

```
Internet → Cloudflare Tunnel → Nginx (:80) → Web (:3000)
                                           → API (:4000) → PostgreSQL + Redis
```

---

## Bước 1: Chuẩn bị trên máy local

### 1.1 Đảm bảo code được push lên GitHub
```bash
# Trên máy Windows của bạn (c:\Project_Movie_Site)
git add -A
git commit -m "Add VPS deploy scripts"
git push origin main
```

> ⚠️ **KHÔNG commit file `.env` thật!** Chỉ commit `.env.vps.example`

---

## Bước 2: SSH vào VPS và chạy Setup

### 2.1 SSH vào VPS
```bash
ssh root@YOUR_VPS_IP
```

### 2.2 Chạy setup script (1 lệnh duy nhất)
```bash
# Thay YOUR_GITHUB_USERNAME/YOUR_REPO_NAME bằng repo thật của bạn
GITHUB_REPO="YOUR_GITHUB_USERNAME/film-site" bash <(curl -fsSL https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/film-site/main/scripts/setup-vps.sh)
```

**Hoặc** clone tay rồi chạy:
```bash
git clone https://github.com/YOUR_USERNAME/film-site.git /opt/cineverse
cd /opt/cineverse
sudo bash scripts/setup-vps.sh
```

> Script sẽ hỏi thông tin khi cần. Với **private repo**, bạn cần GitHub Personal Access Token.

---

## Bước 3: Cấu hình Cloudflare Tunnel (HTTPS miễn phí)

### 3.1 Tạo tài khoản Cloudflare (nếu chưa có)
Đăng ký tại: https://dash.cloudflare.com

### 3.2 Đăng nhập cloudflared trên VPS
```bash
sudo -u deploy cloudflared tunnel login
# Sẽ hiện URL → mở trên browser → chọn domain/Authorize
```

### 3.3 Tạo tunnel
```bash
sudo -u deploy cloudflared tunnel create cineverse
# Lưu lại Tunnel ID hiển thị
```

### 3.4 Cấu hình tunnel trỏ về Nginx
Tạo file cấu hình:
```bash
sudo mkdir -p /home/deploy/.cloudflared
sudo nano /home/deploy/.cloudflared/config.yml
```

Nội dung file:
```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /home/deploy/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - service: http://localhost:80
```

### 3.5 Route DNS (nếu có domain)
```bash
sudo -u deploy cloudflared tunnel route dns cineverse YOUR_SUBDOMAIN.yourdomain.com
```

**Nếu không có domain**, dùng quick tunnel tạm thời:
```bash
sudo -u deploy cloudflared tunnel --url http://localhost:80
# Sẽ cấp URL dạng: https://xxxxx.trycloudflare.com
```

### 3.6 Chạy tunnel như service (tự khởi động)
```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

## Bước 4: Cập nhật URL trong .env

Sau khi có URL Cloudflare Tunnel:
```bash
sudo nano /opt/cineverse/.env
```

Sửa các dòng này:
```env
FRONTEND_URL=https://YOUR_URL.trycloudflare.com
NEXT_PUBLIC_API_URL=https://YOUR_URL.trycloudflare.com/api/v1
```

Sau đó rebuild web container (vì Next.js bake URL vào bundle):
```bash
cd /opt/cineverse
docker compose up -d --build web
```

### Cloudflare Turnstile cho đăng nhập và đăng ký

Tạo một widget **Managed** trong Cloudflare Turnstile, thêm hostname production của CineVerse, rồi đặt hai giá trị sau trong `/opt/cineverse/.env`:

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=YOUR_TURNSTILE_SITE_KEY
TURNSTILE_SECRET_KEY=YOUR_TURNSTILE_SECRET_KEY
```

`TURNSTILE_SECRET_KEY` chỉ thuộc về API, không đưa vào mã nguồn hoặc biến `NEXT_PUBLIC_*`. Sau khi đổi biến môi trường, rebuild cả web và API:

```bash
cd /opt/cineverse
docker compose up -d --build web api
```

---

## Bước 5: Kiểm tra

```bash
# Xem tất cả containers
docker compose -f /opt/cineverse/docker-compose.yml ps

# Xem logs
docker compose -f /opt/cineverse/docker-compose.yml logs -f

# Test API
curl http://localhost:4000/api/v1/health

# Test Web
curl http://localhost:3000
```

---

## Lệnh thường dùng

```bash
# Xem logs real-time
docker compose logs -f

# Restart 1 service
docker compose restart web
docker compose restart api

# Update code mới
cd /opt/cineverse && bash scripts/deploy.sh

# Xem resource usage
docker stats

# Vào shell container
docker compose exec api sh
docker compose exec web sh
docker compose exec postgres psql -U cineverse cineverse_db
```

---

## Troubleshooting

### Web không khởi động được
```bash
docker compose logs web --tail=50
# Thường do: NEXT_PUBLIC_API_URL chưa đúng, cần rebuild
docker compose build web && docker compose up -d web
```

### API không kết nối được Database
```bash
docker compose logs api --tail=50
# Check .env DATABASE_URL
docker compose exec postgres psql -U cineverse -c "\l"
```

### Thiếu memory (OOM)
```bash
free -h
# Nếu thiếu, tạo swap file:
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## Cấu trúc thư mục trên VPS

```
/opt/cineverse/          ← App directory
├── .env                  ← Environment variables (không commit)
├── docker-compose.yml    ← Services config
├── Dockerfile            ← Build config
├── nginx.conf            ← Nginx config
└── scripts/
    ├── setup-vps.sh      ← Setup 1 lần
    └── deploy.sh         ← Update code mới
```
