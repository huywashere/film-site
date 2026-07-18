# 🚀 Hướng dẫn khởi chạy dự án Movie Demo

## Phương án 1: Development Mode (Khuyên dùng cho phát triển)

### Bước 1: Cài đặt Prerequisites

Đảm bảo bạn đã cài:
- ✅ Node.js >= 18 (kiểm tra: `node --version`)
- ✅ PostgreSQL (hoặc dùng Docker)
- ✅ Redis (hoặc dùng Docker)

### Bước 2: Cài đặt Dependencies

```bash
npm install
```

### Bước 3: Setup Environment Variables

File `.env` đã có sẵn, kiểm tra và sửa nếu cần:

```bash
# Nếu chưa có .env, copy từ example
copy .env.example .env
```

Mở file `.env` và điều chỉnh:
- `DATABASE_URL` - Connection string PostgreSQL của bạn
- `REDIS_URL` - Connection string Redis của bạn
- `JWT_SECRET` - Thay đổi thành chuỗi bí mật của bạn

### Bước 4: Setup Database

```bash
# Di chuyển vào thư mục API
cd apps/api

# Generate Prisma Client
npx prisma generate

# Chạy migrations
npx prisma migrate dev

# (Optional) Seed data nếu có
npx prisma db seed

# Quay lại root
cd ../..
```

### Bước 5: Khởi chạy Development Server

```bash
# Chạy tất cả services (API + Web)
npm run dev
```

**Kết quả:**
- 🌐 Web App: http://localhost:3000
- 🔌 API: http://localhost:3001 (hoặc port trong .env)
- 📊 API Docs: http://localhost:3001/api

---

## Phương án 2: Production Mode với Docker (Đơn giản nhất)

### Bước 1: Cài đặt Docker

Đảm bảo đã cài Docker Desktop: https://www.docker.com/products/docker-desktop

### Bước 2: Setup Environment Variables

Tạo file `.env` ở root folder:

```bash
copy .env.example .env
```

Điều chỉnh các biến môi trường cho Docker:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=movie_demo
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/movie_demo

# Redis
REDIS_PASSWORD=redis123
REDIS_URL=redis://:redis123@redis:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this

# API
PORT=4000
NODE_ENV=production

# Frontend
NEXT_PUBLIC_API_URL=http://localhost/api
```

### Bước 3: Build và Khởi chạy

```bash
# Build Docker images
npm run docker:build

# Khởi chạy tất cả services
npm run docker:up

# Xem logs
npm run docker:logs
```

### Bước 4: Setup Database trong Docker

```bash
# Chạy migrations
docker-compose exec api npx prisma migrate deploy

# Generate Prisma Client (nếu cần)
docker-compose exec api npx prisma generate
```

**Kết quả:**
- 🌐 Web App: http://localhost
- 🔌 API: http://localhost/api
- 🗄️ PostgreSQL: localhost:5432
- 💾 Redis: localhost:6379

### Dừng Docker

```bash
npm run docker:down
```

---

## Phương án 3: Chạy riêng từng service

### Terminal 1 - PostgreSQL (nếu dùng Docker)
```bash
docker run -d --name postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=movie_demo \
  -p 5432:5432 \
  postgres:15-alpine
```

### Terminal 2 - Redis (nếu dùng Docker)
```bash
docker run -d --name redis \
  -p 6379:6379 \
  redis:7-alpine
```

### Terminal 3 - API
```bash
cd apps/api
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Terminal 4 - Web
```bash
cd apps/web
npm install
npm run dev
```

---

## 🔍 Kiểm tra dự án chạy thành công

### 1. Kiểm tra API
```bash
curl http://localhost:3001/api/health
# hoặc
curl http://localhost/api/health  (nếu dùng Docker)
```

### 2. Kiểm tra Web
Mở browser: http://localhost:3000 hoặc http://localhost

### 3. Kiểm tra Database
```bash
# Development mode
cd apps/api
npx prisma studio

# Docker mode
docker-compose exec api npx prisma studio
```

---

## 🛠️ Các lệnh hữu ích

### Development
```bash
npm run dev              # Chạy tất cả services
npm run build            # Build tất cả apps
npm run lint             # Kiểm tra code
npm run lint:fix         # Fix linting issues
npm run format           # Format code
npm run db:migrate       # Chạy database migrations
npm run db:studio        # Mở Prisma Studio
```

### Docker
```bash
npm run docker:build     # Build Docker images
npm run docker:up        # Khởi chạy containers
npm run docker:down      # Dừng containers
npm run docker:logs      # Xem logs

# Các lệnh Docker khác
docker-compose ps        # Xem status containers
docker-compose restart   # Restart services
docker-compose exec api sh  # SSH vào API container
```

---

## ❗ Xử lý lỗi thường gặp

### Lỗi: "Port already in use"
```bash
# Tìm và kill process đang dùng port
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Lỗi: "Cannot connect to database"
- Kiểm tra PostgreSQL đang chạy
- Kiểm tra DATABASE_URL trong .env đúng
- Thử restart database

### Lỗi: "Prisma Client not generated"
```bash
cd apps/api
npx prisma generate
```

### Lỗi Docker: "Cannot connect to Docker daemon"
- Khởi động Docker Desktop
- Chờ Docker khởi động hoàn toàn

---

## 📞 Cần hỗ trợ?

Nếu gặp vấn đề:
1. Kiểm tra logs: `npm run docker:logs` hoặc console output
2. Kiểm tra .env file
3. Đảm bảo tất cả dependencies được cài đặt
4. Thử clean install: xóa node_modules và `npm install` lại
