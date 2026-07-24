# Movie Demo - Full Stack Application

A modern full-stack movie application with NestJS API and Next.js frontend.

## 🚀 Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: NestJS, Prisma ORM
- **Database**: PostgreSQL
- **Cache**: Redis
- **Infrastructure**: Docker, Nginx
- **Code Quality**: ESLint, Prettier, EditorConfig

## 📋 Prerequisites

- Node.js >= 18
- Docker & Docker Compose (for production)
- PostgreSQL (for local development)
- Redis (for local development)

## 🚀 Khởi chạy nhanh

### Cách 1: Development Mode (Dễ nhất cho Windows)

Chỉ cần double-click vào file:

1. `setup-dev.bat` - Cài đặt lần đầu
2. `start-dev.bat` - Khởi chạy dự án

### Cách 2: Docker Mode (Đơn giản, không cần cài PostgreSQL/Redis)

Double-click vào file:

- `start-docker.bat` - Tự động build và chạy tất cả

### Cách 3: Manual (Theo từng bước)

Xem chi tiết trong file `SETUP.md`

## 🛠️ Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Copy `.env.example` to `.env` and configure your environment variables:

```bash
copy .env.example .env
```

### 3. Generate Prisma Client & Run Migrations

```bash
cd apps\api
npx prisma generate
npx prisma migrate dev
cd ..\..
```

### 4. Start Development Servers

```bash
npm run dev
```

This will start:

- API on http://localhost:3001
- Web on http://localhost:3000

## 🐳 Docker Deployment

### Build and Run with Docker Compose

```bash
# Build containers
npm run docker:build

# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

Services available:

- Web App: http://localhost
- API: http://localhost/api
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## 📝 Code Quality

### Format Code

```bash
# Check formatting
npm run format:check

# Fix formatting
npm run format
```

### Lint Code

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📁 Project Structure

```
movie_demo/
├── apps/
│   ├── api/          # NestJS API
│   └── web/          # Next.js Frontend
├── docker-compose.yml
├── Dockerfile
├── nginx.conf
├── .prettierrc
├── .editorconfig
└── .eslintrc.json
```

## 🔧 Available Scripts

- `npm run dev` - Start development servers
- `npm run build` - Build all apps
- `npm run lint` - Lint all apps
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run docker:build` - Build Docker images
- `npm run docker:up` - Start Docker containers
- `npm run docker:down` - Stop Docker containers

## 🌐 Nginx Configuration

The Nginx configuration includes:

- Reverse proxy for API and Web
- Gzip compression
- Rate limiting
- Security headers
- Static file caching
- SSL/TLS ready (commented out)

## 📦 Deployment

1. Configure environment variables in `.env`
2. Build Docker images: `npm run docker:build`
3. Start containers: `npm run docker:up`
4. Run migrations: `docker-compose exec api npx prisma migrate deploy`

## 🔐 Security

- JWT authentication
- Rate limiting via Nginx
- Security headers configured
- Environment variables for sensitive data
- CORS configuration

## 📄 License

Private

## 👥 Authors

Your Team
