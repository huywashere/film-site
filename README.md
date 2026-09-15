# FlexPhim - Nền Tảng Xem Phim & Quản Trị Hệ Thống Phân Tán

# FlexPhim - High Performance Distributed Streaming Platform

Repository monorepo đa ngôn ngữ (Polyglot Monorepo) cho nền tảng xem phim trực tuyến FlexPhim, tích hợp streaming HLS tối ưu hóa mạng, hệ thống phân phối đa nguồn, lọc quảng cáo tự động, trí tuệ nhân tạo đề xuất phim và quản trị CMS tập trung.

---

## MỤC LỤC / TABLE OF CONTENTS

1. [Tiếng Việt](#phan-1-tai-lieu-tieng-viet)
   - [Tổng Quan Hệ Thống](#tong-quan-he-thong)
   - [Kiến Trúc Kỹ Thuật Hiện Tại](#kien-truc-ky-thuat-hien-tai)
   - [Ngăn Xếp Công Nghệ](#ngan-xep-cong-nghe)
   - [Cấu Trúc Thư Mục Monorepo](#cau-truc-thu-muc-monorepo)
   - [Yêu Cầu Môi Trường](#yeu-cau-moi-truong)
   - [Hướng Dẫn Cài Đặt & Khởi Chạy](#huong-dan-cai-dat--khoi-chay)
   - [Danh Mục Lệnh Vận Hành](#danh-muc-lenh-van-hanh)
   - [Bảo Mật & Chuẩn Độ Tin Cậy](#bao-mat--chuan-do-tin-cay)
2. [English](#part-2-english-documentation)
   - [System Overview](#system-overview)
   - [Current System Architecture](#current-system-architecture)
   - [Technology Stack](#technology-stack)
   - [Monorepo Structure](#monorepo-structure)
   - [Prerequisites](#prerequisites)
   - [Setup & Launch Guide](#setup--launch-guide)
   - [Available Scripts](#available-scripts)
   - [Security & Reliability](#security--reliability)

---

# PHẦN 1: TÀI LIỆU TIẾNG VIỆT

## Tổng Quan Hệ Thống

FlexPhim được xây dựng theo mô hình hệ thống phân tán, xử lý đồng thời lưu lượng truy cập lớn của người dùng xem phim trực tuyến (High-Concurrency Streaming) cùng hệ sinh thái dịch vụ phụ trợ (Microservices & Background Workers).

Mục tiêu cốt lõi của hệ thống:

- Phát video trực tuyến chuẩn HLS độ trễ thấp, thích ứng băng thông động (ABR), tích hợp bộ lọc làm sạch quảng cáo nhà cái từ gốc luồng M3U8.
- Trình phát video chuẩn ArtPlayer Editor với giao diện tối giản Dark Cinematic, đánh dấu mốc mở đầu (Intro) và mốc quảng cáo tự động.
- Hệ thống tổng hợp dữ liệu phim từ nhiều nguồn cung cấp (KKPhim, OPhim, NguonC, ViCDN, VSMov, VidSrc), tự động deduplication và chuẩn hóa dữ liệu.
- Đồng bộ hình ảnh độ phân giải cao từ TMDB trực tiếp, hỗ trợ tìm kiếm phim thông minh và bộ máy gợi ý phim bằng học máy (Scikit-Learn).
- Bảng điều khiển quản trị CMS với hệ thống giám sát sức khỏe nguồn phim thời gian thực (Provider Health Monitoring) và hạn mức API OMDb/TMDB.

## Kiến Trúc Kỹ Thuật Hiện Tại

Hệ thống được tổ chức dưới dạng Monorepo quản lý bởi Turborepo và pnpm workspace, bao gồm các tầng dịch vụ chuyên biệt:

```text
                                [ Nguoi Dung / Browser ]
                                           |
                                [ Cloudflare Edge / WAF ]
                                           |
                               [ OpenResty / Nginx Proxy ]
                                           |
             +-----------------------------+-----------------------------+
             |                             |                             |
    [ apps/web ] (Next.js 16)      [ apps/api ] (NestJS 11)     [ apps/admin ] (Next.js 16)
    - SSR & App Router             - Quan ly xac thuc JWT/2FA    - Bang dieu khien CMS
    - ArtPlayer HLS Native         - Giao dich du lieu Prisma    - Provider Health Monitor
    - Client Cache TanStack        - Socket.IO Watch Party       - Quan ly quang cao & cued
             |                             |                             |
             +--------------+--------------+-----------------------------+
                            |
             +--------------+--------------+-----------------------------+
             |                             |                             |
    [ services/media-gateway ]    [ services/media-worker-rs ]  [ services/recommendation ]
    - Ngon ngu: Go (Gin)          - Ngon ngu: Rust (Tokio)      - Ngon ngu: Python (FastAPI)
    - Aggregator da nguon phim    - Phan tich stream HLS async  - Scikit-Learn Machine Learning
    - Reverse proxy luong HLS     - Kiem tra chat luong video   - Goi y phim Top 10 & Similar
             |                             |                             |
             +--------------+--------------+-----------------------------+
                            |
             +--------------+--------------+
             |                             |
    [ Ha Tang Du Lieu ]           [ Message Broker & Cache ]
    - PostgreSQL 16 (Authoritative)- Redis 7 (Cache, Rate Limit, Socket adapter)
    - Prisma ORM 6                - RabbitMQ (Distributed Crawl & Event Bus)
```

### Các Thành Phần Trọng Yếu

1. Tầng Giao Diện Người Dùng (apps/web):
   - Xây dựng trên Next.js 16 và React 18 với kiến trúc App Router tối ưu SEO và SSR.
   - Trình phát ArtPlayer 5 tuân thủ chuẩn ArtPlayer Editor: màu chủ đạo Cyan (#23ade5), vạch quảng cáo Gold/Yellow (#fbbf24), hỗ trợ tua nhanh 10s vòng cung SVG, tự động chuyển luồng dự phòng và tự động bỏ qua mở đầu/quảng cáo.
   - Cơ chế bảo vệ đoạn mở đầu (Opening Protection): Bỏ qua nhận diện điểm ngắt quảng cáo trong 3 phút đầu phim (start < 180s) để tránh cắt nhầm nhạc hiệu mở màn và cảnh mở đầu.
   - Giao diện Dark Cinematic sang trọng, hỗ trợ xem chung (Watch Party) thời gian thực qua WebSockets.

2. Tầng Máy Chủ Nghiệp Vụ (apps/api):
   - Xây dựng trên NestJS 11 với TypeScript nghiêm ngặt.
   - Quản lý định danh (Authentication) bằng JWT, Refresh Token, Google OAuth 2.0 và xác thực hai yếu tố (2FA TOTP).
   - Bảo vệ form liên hệ và báo lỗi bằng Cloudflare Turnstile, chống spam qua distributed rate limiter.
   - Tương tác cơ sở dữ liệu qua Prisma ORM với PostgreSQL, tích hợp Sentry phục vụ cảnh báo lỗi thời gian thực.

3. Tầng Quản Trị Hệ Thống (apps/admin):
   - Quản lý toàn diện kho phim, tập phim, danh mục thể loại, diễn viên và cấu hình điểm ngắt quảng cáo (Ad Cue Points).
   - Module Giám Sát Sức Khỏe Nguồn Phim (Provider Health Panel): Kiểm tra tự động định kỳ 60 giây, đo lường độ trễ mạng (latency), trạng thái HTTP, cảnh báo hạn mức API (Quota) OMDb và TMDB.

4. Cổng Truyền Thông & Xử Lý Stream (services/media-gateway & media-worker-rs):
   - media-gateway (Go/Gin): Tổng hợp catalog từ các bên thứ ba, chuyển tiếp và ký số cho các URL luồng phát proxy HLS.
   - media-worker-rs (Rust/Tokio): Worker bất đồng bộ chuyên kiểm thử tính toàn vẹn của phân đoạn .ts/.m4s, lập chỉ mục chất lượng bitrate mà không làm nghẽn tiến trình người dùng.

5. Bộ Máy Đề Xuất Học Máy (services/recommendation-engine):
   - Viết bằng Python FastAPI kết hợp thư viện Scikit-Learn.
   - Tính toán ma trận độ tương đồng phim (TF-IDF và Cosine Similarity), xây dựng danh sách Top 10 thịnh hành và gợi ý phim cùng gu dựa trên lịch sử xem của người dùng.

6. Hàng Đợi Sự Kiện & Bộ Nhớ Tạm (RabbitMQ & Redis):
   - RabbitMQ điều phối tác vụ cào dữ liệu phim (Crawling Jobs) và cập nhật bộ nhớ đệm phân tán.
   - Redis đảm nhiệm lưu trữ phiên làm việc, danh sách thông báo, giới hạn tần suất yêu cầu và adapter đồng bộ WebSockets.

## Ngăn Xếp Công Nghệ

- Quản lý Monorepo: Turborepo 2, pnpm 9 Workspace.
- Frontend Web: Next.js 16, React 18, Tailwind CSS, ArtPlayer 5, Hls.js, TanStack Query 5, Zustand, Lucide React, Lenis.
- Quản trị Admin: Next.js 16, Tabler Icons, Tailwind CSS, TanStack Query.
- Backend API: NestJS 11, TypeScript 5, Prisma ORM 6, Passport, Socket.IO, Sentry.
- Dịch vụ mở rộng: Go 1.22+ (Gin), Rust 2021 Edition (Tokio), Python 3.11 (FastAPI, Scikit-Learn).
- Lưu trữ & Hàng đợi: PostgreSQL 16, Redis 7, RabbitMQ 3.
- Hạ tầng & Cổng mạng: Docker Compose, OpenResty/Nginx, Cloudflare.
- Kiểm thử & Chất lượng mã: Playwright (E2E), Node.js Test Runner / tsx (Unit Tests), ESLint 9, Prettier.

## Cấu Trúc Thư Mục Monorepo

```text
Project_Movie_Site/
├── apps/
│   ├── api/                  # NestJS Core API va nghiep vu chinh
│   ├── web/                  # Next.js 16 Portal nguoi dung xem phim
│   └── admin/                # Next.js 16 Bang dieu khien quan tri CMS
├── services/
│   ├── media-gateway/        # Cong truyen thong Go/Gin va proxy HLS
│   ├── media-worker-rs/      # Worker phan tich stream HLS viet bang Rust
│   └── recommendation-engine/# Bo may tri tue nhan tao goi y phim (Python)
├── packages/
│   └── shared-types/         # Hop dong kieu du lieu dung chung (TypeScript)
├── infra/
│   ├── docker/               # Docker Compose cho cac dich vu co so
│   ├── openresty/            # Cau hinh Reverse Proxy va WAF Edge
│   ├── kubernetes/           # Manifests trien khai Cum Kubernetes
│   └── terraform/            # Ma nguon ha tang dang ma hoa (IaC)
├── docs/
│   ├── architecture/         # Tai lieu kien truc he thong chi tiet
│   ├── runbooks/             # Quy trinh van hanh va xu ly su co
│   └── admin-operations.md   # Huong dan van hanh trang quan tri
├── scripts/                  # Tap lenh tien ich database va hieu nang
├── package.json              # Cau hinh root workspace pnpm & turbo
├── turbo.json                # Quy dinh pipeline build/test/lint
└── SETUP.md                  # Huong dan thiet lap chi tiet tung buoc
```

## Yêu Cầu Môi Trường

- Node.js >= 18.18.0 (khuyen nghi Node.js 20 LTS)
- pnpm >= 9.5.0
- Docker & Docker Compose (cho moi truong co so du lieu & production)
- PostgreSQL 16
- Redis 7
- Python >= 3.10 (neu chay bo may AI Recommendation cuc bo)
- Go >= 1.22 (neu bien dich Media Gateway cuc bo)

## Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Cai Dat Dependencies

Chay lenh cai dat toan bo monorepo:

```bash
pnpm install
```

### 2. Thiet Lap Bien Moi Truong

Sao chep tep mau `.env.example` sang `.env` o thu muc goc va cac app tuong ung:

```bash
copy .env.example .env
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env
```

### 3. Khoi Tao Co So Du Lieu

Khoi tao schema PostgreSQL va cap nhat Prisma Client:

```bash
pnpm --filter api db:migrate
pnpm --filter api db:seed
```

### 4. Khoi Chay Ung Dung

Cach A: Khoi chay nhanh qua Batch Script (Windows)

- Khoi chay toan bo he thong: Chay tep `start-all.bat`
- Dung toan bo he thong: Chay tep `stop-all.bat`

Cach B: Khoi chay qua dong lenh pnpm/turbo

```bash
# Khoi chay tat ca ung dung o che do Development
pnpm dev

# Hoac chi khoi chay ung dung Web
pnpm --filter web dev

# Hoac chi khoi chay API
pnpm --filter api dev

# Hoac chi khoi chay Admin CMS
pnpm --filter @netphim/admin-cms dev
```

Cac cong dich vu mac dinh:

- Web Application: http://localhost:3000
- Core Backend API: http://localhost:3001
- Admin CMS: http://localhost:3002
- Recommendation Service: http://localhost:8000
- Media Gateway: http://localhost:8080

## Danh Mục Lệnh Vận Hành

```bash
# Kiem thu don vi toan bo he thong
pnpm --filter web test:unit

# Kiem tra cu phap va quy chuan ma nguon (Linting)
pnpm lint

# Tu dong sua loi cu phap (Lint Fix)
pnpm lint:fix

# Kiem tra dinh dang ma nguon (Prettier)
pnpm format:check

# Tu dong dinh dang ma nguon
pnpm format

# Xay dung ban bundle san sang trien khai (Production Build)
pnpm build

# Chay kiem thu End-to-End
pnpm --filter web test:e2e

# Kiem tra bao cao hieu nang truy van database
pnpm db:performance

# Sao luu co so du lieu PostgreSQL tu dong
pnpm --filter api metadata:backfill
```

## Bảo Mật & Chuẩn Độ Tin Cậy

1. Bảo Vệ Luồng Phát (Stream Security):
   - Ký số URL HLS proxy với HMAC SHA-256 kèm thời hạn hiệu lực (TTL).
   - Kiểm duyệt domain media theo danh sách trắng (Whitelist), ngăn chặn triệt để SSRF và rò rỉ mạng nội bộ.
   - Sandbox nghiêm ngặt cho iframe bên thứ ba, cấu hình Referrer Policy: strict-origin-when-cross-origin.

2. Chống Tấn Công & Spam (Anti-Abuse):
   - Xác thực Cloudflare Turnstile cho biểu mẫu liên hệ, gửi báo lỗi phim.
   - Rate limiting phân tán qua Redis cho từng địa chỉ IP người dùng.
   - Lọc mã độc XSS qua DOMPurify ở client và xss/helmet ở server.

3. Khả Năng Chống Chịu Lỗi (High Availability & Resilience):
   - Tự động chuyển đổi máy chủ phát dự phòng khi nguồn chính gặp sự cố HTTP 404/500 hoặc nghẽn mạng.
   - Cache nhiều lớp: Cloudflare Edge -> OpenResty Nginx Cache -> Redis in-memory -> Database fallback.

---

# PART 2: ENGLISH DOCUMENTATION

## System Overview

FlexPhim is a high-concurrency, polyglot monorepo streaming platform engineered for seamless video delivery, multi-provider catalog federation, automated HLS ad sanitization, machine-learning-based recommendations, and centralized CMS administration.

Key capabilities:

- Low-latency HLS video playback with Adaptive Bitrate (ABR) streaming and automated root-level M3U8 ad filtering.
- ArtPlayer Editor native standard player with dark cinematic design, automated opening markers, and skippable ad cues.
- Multi-source provider aggregation (KKPhim, OPhim, NguonC, ViCDN, VSMov, VidSrc) with intelligent entity resolution and deduplication.
- Direct TMDB high-definition artwork pipeline, real-time catalog search, and scikit-learn collaborative filtering.
- Operational Admin CMS equipped with a 60-second automated Provider Health Monitoring panel and OMDb/TMDB API quota tracking.

## Current System Architecture

The monorepo is orchestrated via Turborepo and pnpm workspaces, enforcing explicit boundaries across specialized runtimes:

```text
                                [ User / Client Browser ]
                                           |
                                [ Cloudflare Edge / WAF ]
                                           |
                               [ OpenResty / Nginx Ingress ]
                                           |
             +-----------------------------+-----------------------------+
             |                             |                             |
    [ apps/web ] (Next.js 16)      [ apps/api ] (NestJS 11)     [ apps/admin ] (Next.js 16)
    - SSR & App Router             - JWT / 2FA Authentication   - CMS Management Dashboard
    - ArtPlayer HLS Native         - Prisma ORM Transactions    - Provider Health Monitor
    - TanStack Query Cache         - Socket.IO Watch Party      - Ads & Cue Points Control
             |                             |                             |
             +--------------+--------------+-----------------------------+
                            |
             +--------------+--------------+-----------------------------+
             |                             |                             |
    [ services/media-gateway ]    [ services/media-worker-rs ]  [ services/recommendation ]
    - Language: Go (Gin)          - Language: Rust (Tokio)      - Language: Python (FastAPI)
    - Multi-source Catalog Relay  - Asynchronous HLS Analyzer   - Scikit-Learn Recommender
    - HLS Stream Reverse Proxy    - Stream Bitrate Diagnostics  - Top 10 & Similar Matching
             |                             |                             |
             +--------------+--------------+-----------------------------+
                            |
             +--------------+--------------+
             |                             |
    [ Data Persistence ]          [ Event Bus & Caching ]
    - PostgreSQL 16 (Authoritative)- Redis 7 (Cache, Rate Limits, Socket adapter)
    - Prisma ORM 6                - RabbitMQ (Distributed Crawling & Invalidation)
```

### Core Subsystems

1. Presentation & Playback (apps/web):
   - Powered by Next.js 16 and React 18 with server-side rendering for optimal SEO and fast time-to-interactive.
   - ArtPlayer 5 implementation strictly follows the ArtPlayer Editor specification: Cyan theme (#23ade5), Gold/Yellow ad markers (#fbbf24), 10-second SVG arc seek controls, and seamless fallback switching.
   - Opening Window Protection: Ignores potential ad interruptions in the first 3 minutes of playback (start < 180s) to safeguard studio logos, distributor bumpers, and film introductions from accidental cuts.
   - Real-time cinema Watch Party synchronized via WebSockets.

2. Core Backend Services (apps/api):
   - Structured on NestJS 11 with enterprise TypeScript patterns.
   - Secures identities with JWT access/refresh tokens, Google OAuth 2.0, and RFC 6238 2FA TOTP.
   - Verifies contact and support report submissions using Cloudflare Turnstile, enforced by a distributed token-bucket rate limiter.
   - Manages relational state through Prisma ORM 6 on PostgreSQL 16 with integrated Sentry performance telemetry.

3. Operations & Management (apps/admin):
   - Administers movies, episodes, taxonomy, cast associations, and advertisement cue points.
   - Real-time Provider Health Panel: Executes automated probes every 60 seconds, displaying provider latency, upstream HTTP status, and visual OMDb/TMDB daily quota gauges.

4. Streaming Pipeline (services/media-gateway & media-worker-rs):
   - media-gateway (Go/Gin): High-throughput catalog aggregation, stream origin fallback routing, and signed HLS manifest relaying.
   - media-worker-rs (Rust/Tokio): Non-blocking asynchronous worker that inspects fragment headers and validates transport streams out-of-band without delaying client playback.

5. Machine Learning Recommender (services/recommendation-engine):
   - Built with Python 3.11, FastAPI, and Scikit-Learn.
   - Generates content-based TF-IDF cosine similarity matrices to power real-time Top 10 trending rows and similar title recommendations.

6. Asynchronous Messaging & Caching (RabbitMQ & Redis):
   - RabbitMQ decouples catalog ingestion, web crawling, and cache warm-up jobs.
   - Redis manages distributed cache layers, session states, Socket.IO cross-instance messaging, and rate limit counters.

## Technology Stack

- Monorepo Engine: Turborepo 2, pnpm 9 Workspace.
- Frontend App: Next.js 16, React 18, Tailwind CSS, ArtPlayer 5, Hls.js, TanStack Query 5, Zustand, Lucide React, Lenis.
- Admin Application: Next.js 16, Tabler Icons, Tailwind CSS, TanStack Query.
- Backend Core: NestJS 11, TypeScript 5, Prisma ORM 6, Passport, Socket.IO, Sentry.
- Extended Microservices: Go 1.22+ (Gin), Rust 2021 Edition (Tokio), Python 3.11 (FastAPI, Scikit-Learn).
- Persistence & Messaging: PostgreSQL 16, Redis 7, RabbitMQ 3.
- Ingress & Security: Docker Compose, OpenResty/Nginx, Cloudflare Turnstile.
- Testing Suite: Playwright (E2E), Node.js Test Runner / tsx (Unit Tests), ESLint 9, Prettier.

## Monorepo Structure

```text
Project_Movie_Site/
├── apps/
│   ├── api/                  # NestJS core backend API
│   ├── web/                  # Next.js 16 client streaming portal
│   └── admin/                # Next.js 16 operational control dashboard
├── services/
│   ├── media-gateway/        # Go/Gin high-throughput media reverse proxy
│   ├── media-worker-rs/      # Rust/Tokio asynchronous HLS stream analyzer
│   └── recommendation-engine/# Python/Scikit-Learn recommendation service
├── packages/
│   └── shared-types/         # Shared TypeScript contracts and schemas
├── infra/
│   ├── docker/               # Container configurations for local and production
│   ├── openresty/            # Reverse proxy, caching, and WAF rules
│   ├── kubernetes/           # Production Kubernetes deployment specs
│   └── terraform/            # Infrastructure as Code definitions
├── docs/
│   ├── architecture/         # Comprehensive architecture specifications
│   ├── runbooks/             # Operational runbooks and incident response
│   └── admin-operations.md   # Administrator guidance
├── scripts/                  # Performance analysis and maintenance scripts
├── package.json              # Monorepo root dependencies and script entrypoints
├── turbo.json                # Turborepo task pipeline configuration
└── SETUP.md                  # Comprehensive step-by-step setup guide
```

## Prerequisites

- Node.js >= 18.18.0 (Node.js 20 LTS recommended)
- pnpm >= 9.5.0
- Docker & Docker Compose (for persistence containers and deployment)
- PostgreSQL 16
- Redis 7
- Python >= 3.10 (if running Recommendation Engine locally)
- Go >= 1.22 (if building Media Gateway locally)

## Setup & Launch Guide

### 1. Install Dependencies

Install packages across all workspaces:

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy environment templates to active configuration files:

```bash
copy .env.example .env
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env
```

### 3. Initialize Database

Execute migrations and seed baseline data:

```bash
pnpm --filter api db:migrate
pnpm --filter api db:seed
```

### 4. Start Development Runtimes

Option A: Windows Batch Launchers

- Start complete suite: Execute `start-all.bat`
- Stop complete suite: Execute `stop-all.bat`

Option B: pnpm Workspace Commands

```bash
# Start all development processes concurrently
pnpm dev

# Or launch only the web streaming client
pnpm --filter web dev

# Or launch only the backend API
pnpm --filter api dev

# Or launch only the admin CMS
pnpm --filter @netphim/admin-cms dev
```

Default local endpoints:

- Web Application: http://localhost:3000
- Core Backend API: http://localhost:3001
- Admin CMS Dashboard: http://localhost:3002
- Recommendation Engine: http://localhost:8000
- Media Gateway: http://localhost:8080

## Available Scripts

```bash
# Execute unit test suites
pnpm --filter web test:unit

# Run static code analysis across workspaces
pnpm lint

# Automatically resolve fixable lint issues
pnpm lint:fix

# Verify code formatting conformance
pnpm format:check

# Format code with Prettier
pnpm format

# Generate production distribution bundles
pnpm build

# Execute Playwright End-to-End test suites
pnpm --filter web test:e2e

# Inspect PostgreSQL query performance and table scans
pnpm db:performance

# Trigger automated metadata backfill
pnpm --filter api metadata:backfill
```

## Security & Reliability

1. Playback Security:
   - Proxy URLs are signed with HMAC SHA-256 and bounded with expiration timestamps.
   - Upstream media hosts are strictly validated against an approved origin whitelist to prevent SSRF vulnerabilities.
   - Third-party player embeds operate within restricted sandbox contexts with strict-origin-when-cross-origin referrer policies.

2. Anti-Abuse & Rate Limiting:
   - Form submissions are verified through Cloudflare Turnstile token validation.
   - Distributed rate limiting via Redis guards sensitive endpoints against volumetric flooding.
   - Input payloads are sanitized through DOMPurify and strict server-side validation pipes.

3. Failover & Resilience:
   - Automated in-player failover transitions between direct CDN delivery and authenticated proxy relays upon stream failures.
   - Multi-tier cache strategy: Cloudflare Edge -> OpenResty Nginx Cache -> Redis in-memory -> PostgreSQL database.
