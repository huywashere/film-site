# Kien Truc He Thong FlexPhim / FlexPhim System Architecture Specification

Tai lieu quy chuan kien truc he thong phan tan FlexPhim, phan dinh ranh gioi dich vu, luong du lieu, co che chiu loi va quy trinh van hanh monorepo.

---

## MUC LUC / TABLE OF CONTENTS

1. [Phan 1: Quy Chuan Kien Truc He Thong (Tieng Viet)](#phan-1-quy-chuan-kien-truc-he-thong-tieng-viet)
   - [1. Ranh Gioi Dich Vu & Trach Nhiem (Service Boundaries)](#1-ranh-gioi-dich-vu--trach-nhiem-service-boundaries)
   - [2. So Do Luong Yeu Cau & Du Lieu (Request & Data Flow)](#2-so-do-luong-yeu-cau--du-lieu-request--data-flow)
   - [3. Kien Truc Trinh Phat Video & Xu Ly Luong HLS](#3-kien-truc-trinh-phat-video--xu-ly-luong-hls)
   - [4. He Thong Giam Sat Suc Khoe Nguon Phim (Provider Health Engine)](#4-he-thong-giam-sat-suc-khoe-nguon-phim-provider-health-engine)
   - [5. Hang Doi Thong Diep & Dong Bo Bat Dong Bo (RabbitMQ & Redis)](#5-hang-doi-thong-diep--dong-bo-bat-dong-bo-rabbitmq--redis)
   - [6. Bo May Goi Y Phim Tri Tue Nhan Tao (Recommendation Engine)](#6-bo-may-goi-y-phim-tri-tue-nhan-tao-recommendation-engine)
   - [7. Quyen So Huu Du Lieu & Chien Luoc Luu Tru](#7-quyen-so-huu-du-lieu--chien-luoc-luu-tru)
   - [8. Quy Tac Kien Truc Bat Bien (Architectural Invariants)](#8-quy-tac-kien-truc-bat-bien-architectural-invariants)
2. [Part 2: System Architecture Specification (English)](#part-2-system-architecture-specification-english)
   - [1. Service Boundaries & Runtime Ownership](#1-service-boundaries--runtime-ownership)
   - [2. End-to-End Request & Data Flow](#2-end-to-end-request--data-flow)
   - [3. Media Playback & HLS Streaming Engine](#3-media-playback--hls-streaming-engine)
   - [4. Provider Health & Telemetry Engine](#4-provider-health--telemetry-engine)
   - [5. Asynchronous Event Bus & Distributed Caching](#5-asynchronous-event-bus--distributed-caching)
   - [6. Machine Learning Recommendation Service](#6-machine-learning-recommendation-service)
   - [7. Data Ownership & Persistence Strategy](#7-data-ownership--persistence-strategy)
   - [8. Architectural Invariants & Failure Modes](#8-architectural-invariants--failure-modes)

---

# PHAN 1: QUY CHUAN KIEN TRUC HE THONG (TIENG VIET)

## 1. Ranh Gioi Dich Vu & Trach Nhiem (Service Boundaries)

FlexPhim duoc to chuc theo mo hinh Polyglot Monorepo. Moi runtime dam nhan mot pham vi trach nhiem duy nhat va co ranh gioi phan dinh ro rang:

| Thanh Phan                     | Cong Nghe / Runtime                 | Pham Vi Trach Nhiem                                                              |
| ------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------- |
| apps/web                       | Next.js 16, React 18, Tailwind      | Giao dien nguoi dung, SSR/BFF, trai nghiem phat phim ArtPlayer HLS, SEO          |
| apps/admin                     | Next.js 16, Tabler Icons            | Bang dieu khien quan tri CMS, Provider Health Monitor, cau hinh diem quang cao   |
| apps/api                       | NestJS 11, Prisma ORM 6             | Quan ly danh tinh, xac thuc 2FA, quan ly giao dich du lieu, Socket.IO realtime   |
| services/media-gateway         | Go 1.22+ (Gin)                      | Tong hop da nguon phim, reverse proxy HLS toc do cao, ky so URL, circuit breaker |
| services/media-worker-rs       | Rust 2021 (Tokio)                   | Worker phan tich do toan ven cua file stream HLS bat dong bo, danh gia bitrate   |
| services/recommendation-engine | Python 3.11 (FastAPI, Scikit-Learn) | Tinh toan vector tuong dong, goi y phim theo hanh vi va danh sach Top 10         |
| packages/shared-types          | TypeScript                          | Khai bao hop dong kieu du lieu va schema dung chung giua Web, API, Admin         |
| PostgreSQL 16                  | Relational Database                 | Co so du lieu nguon goc (Source of Truth) cho nguoi dung, phim, tap phim         |
| Redis 7                        | In-Memory Data Store                | Luu tru phien, rate limit, cache da lop, dong bo Socket.IO giua cac node         |
| RabbitMQ 3                     | AMQP Message Broker                 | Hang doi dieu phoi tac vu cao du lieu (Crawl) va vo hieu hoa cache phan tan      |
| OpenResty                      | Nginx + Lua Engine                  | Diem ket thuc TLS, can bang tai, kiem soat WAF va bo nho dem canh (Edge Cache)   |

## 2. So Do Luong Yeu Cau & Du Lieu (Request & Data Flow)

```text
[ Nguoi Dung / Client Browser ]
              |
              v (HTTPS)
   [ Cloudflare Edge / WAF ]
              |
              v
  [ OpenResty Ingress Gateway ]
   |                        |
   +-- (Duyet Web/SSR) ----> [ apps/web ] (Port 3000)
   |                             |
   |                             +--> [ TMDB CDN ] (Hinh anh poster/backdrop truc tiep)
   |                             +--> [ apps/api ] (Goi API du lieu nguoi dung)
   |
   +-- (Quan Tri CMS) -----> [ apps/admin ] (Port 3002)
   |                             |
   |                             +--> [ apps/api ] (Doc/ghi du lieu quan tri)
   |                             +--> [ /api/provider-health ] (Kiem tra trang thai nguon)
   |
   +-- (Core API & Auth) --> [ apps/api ] (Port 3001)
   |                             |
   |                             +--> [ PostgreSQL ] (Giao dich Prisma)
   |                             +--> [ Redis ] (Cache & Session)
   |                             +--> [ RabbitMQ ] (Phat su kien / Xu ly hang doi)
   |                             +--> [ recommendation-engine ] (Port 8000)
   |
   +-- (Proxy Phat Phim) --> [ services/media-gateway ] (Port 8080)
                                 |
                                 +--> [ Upstream Movie CDNs ] (Lay file manifest .m3u8)
                                 +--> [ Redis Stream ] ----> [ services/media-worker-rs ]
```

## 3. Kien Truc Trinh Phat Video & Xu Ly Luong HLS

Trinh phat video tai `apps/web` tuan thu nghiem ngat tieu chuan ban quyen cua ArtPlayer Editor:

- Giao dien: Mau chu dao Cyan (#23ade5), bieu tuong trang thai goc, nut tua 10s vong cung SVG tinh xao, bo dieu khien chat luong dong (Quality Selector) tich hop trong thanh dieu khien chinh.
- Luong phat (Transport Routing):
  - Uu tien 1: Phat truc tiep tu CDN nguon co bang thong cao (Direct HLS Transport).
  - Uu tien 2: Tu dong chuyen sang cong Relay ky so (`/api/hls-proxy` hoac `media-gateway`) khi ket noi truc tiep gap su co HTTP 404, CORS hoac nghẽn mang.
  - Uu tien 3: Fallback sang trinh phat iframe du phong co sandbox bao mat cao.
- Bo loc quang cao va bao ve doan mo dau (Opening Window Protection):
  - Bỏ qua diem ngat quang cao o doan dau: Toan bo cac diem cat ky thuat (discontinuity) trong 3 phut dau phim (start < 180 giay hoac start < skipIntroEnd) khong duoc coi la quang cao. Dieu nay bao ve tuyet doi doan logo hang phim, nhac hieu mo man va canh mo dau khoi bi cat nham.
  - Cac diem ngat quang cao duoc phep (Mid-roll/Post-roll): Chi duoc kich hoat khi start >= 180 giay. Khi do, he thong danh dau vach vang (#fbbf24) tren timeline va ho tro nut dem nguoc bo qua (Skip Ad) hoac tu dong tua qua theo thiet lap nguoi dung.

## 4. He Thong Giam Sat Suc Khoe Nguon Phim (Provider Health Engine)

Module giam sat tich hop tai `apps/admin` giup he thong chu dong phat hien va loai bo nguon hong:

- Chu ky tham do: Moi 60 giay thong qua Proxy server-side (`/api/provider-health`).
- Chi so giam sat: Thoi gian phan hoi (Latency tính bang ms), ma trang thai HTTP upstream, tinh san sang cua manifest m3u8.
- Theo doi han muc (Quota Tracker): Giam sat luong request trong ngay cua OMDb va TMDB, hien thi thanh phan tram truc quan, thoi gian reset han muc va luong request tiet kiem duoc nho Redis cache.

## 5. Hang Doi Thong Diep & Dong Bo Bat Dong Bo (RabbitMQ & Redis)

1. RabbitMQ:
   - Exchange `movie.events` (Topic) phan phoi cac su kien them phim moi, cap nhat tap phim.
   - Queue `movie.crawl.queue`: Dieu phoi tien trinh cao du lieu tu dong tu nhieu nha cung cap ma khong gay nghen API chinh.
   - Queue `movie.cache.invalidate`: Phat tin hieu xoa cache tuc thi den cac instance Web va Gateway khi co ban ghi thay doi.

2. Redis:
   - Cache-Aside Pattern: Du lieu chi tiet phim duoc cache voi TTL linh hoat (1 gio cho phim cu, 5 phut cho phim dang chieu).
   - Socket.IO Redis Adapter: Chia se trang thai phong xem chung (Watch Party) dong bo xuyen suot giua cac tien trinh API chay song song.
   - Distributed Rate Limiter: Kiem soat luu luong truy cap theo Token Bucket danh cho tung dia chi IP.

## 6. Bo May Goi Y Phim Tri Tue Nhan Tao (Recommendation Engine)

Dich vu `services/recommendation-engine` chay doc lap tren nen tang Python FastAPI:

- Xu ly ngon ngu tu nhien (NLP): Trich xuat dac trung the loai, dao dien, dien vien, tom tat noi dung va quoc gia.
- Thuat toan: Tinh toan ma tran trong so TF-IDF va do tuong dong Cosine (Cosine Similarity).
- Bang xep hang Top 10: Ket hop diem danh gia TMDB, so luot xem trong tuan va xu huong nguoi dung de tinh toan danh sach Top 10 thi truong thoi gian thuc.

## 7. Quyen So Huu Du Lieu & Chien Luoc Luu Tru

- PostgreSQL: Luu tru duy nhat va co tinh toan ven tuyet doi cho tai khoan, mat khau da hash (bcrypt), lich su xem phim, danh sach yeu thich, thong bao he thong va nhat ky thanh toan.
- Redis: Du lieu co the tao lai bat cu luc nao; su co mat ket noi Redis khong duoc lam sap he thong doc/ghi co ban cua PostgreSQL.
- TMDB: Chi luu tru ma dinh danh (TMDB ID) trong PostgreSQL; toan bo hinh anh poster, backdrop duoc render truc tiep tu CDN TMDB nham toi uu bang thong may chu.
- Hop dong kieu du lieu (`@netphim/shared-types`): Chi chua cac kieu du lieu TypeScript thuan tuy, khong import cac thu vien React, NestJS hoac Prisma.

## 8. Quy Tac Kien Truc Bat Bien (Architectural Invariants)

1. Khong truy cap truc tiep nha cung cap tu Browser: Moi yeu cau lay du lieu nguon ngoai phai thuc hien qua Proxy server de bao ve dia chi IP nguoi dung va phong chong chan quang cao phia client.
2. Bao ve URL Proxy: URL HLS Proxy bat buoc phai co chu ky HMAC SHA-256 va thoi gian het han. He thong khong bao gio ghi log query string cua HLS vao he thong log tap trung.
3. Kiem soat loi phan cap: Khi stream loi, trinh phat phai thu lan luot: Direct CDN -> Signed Proxy Relay -> Alternate Provider Server -> Iframe Sandbox -> Báo loi nguoi dung.
4. Trien khai an toan: Moi thay doi schema co so du lieu bat buoc phai thuc hien qua migration step-by-step, kiem thu E2E va build thanh cong truoc khi release.

---

# PART 2: SYSTEM ARCHITECTURE SPECIFICATION (ENGLISH)

## 1. Service Boundaries & Runtime Ownership

FlexPhim is structured as a high-concurrency polyglot monorepo. Each runtime maintains an explicit boundary and strict single-responsibility contract:

| Component                      | Technology Stack                    | Core Responsibility                                                              |
| ------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------- |
| apps/web                       | Next.js 16, React 18, Tailwind      | Client portal, SSR/BFF, ArtPlayer native streaming, SEO optimization             |
| apps/admin                     | Next.js 16, Tabler Icons            | Administrative CMS, Provider Health Monitor, Ad Cue Points controller            |
| apps/api                       | NestJS 11, Prisma ORM 6             | Identity provider, 2FA, transactional data persistence, Socket.IO realtime       |
| services/media-gateway         | Go 1.22+ (Gin)                      | High-throughput multi-source catalog aggregation, HLS reverse proxy, URL signing |
| services/media-worker-rs       | Rust 2021 (Tokio)                   | Asynchronous HLS segment verification and video bitrate analysis                 |
| services/recommendation-engine | Python 3.11 (FastAPI, Scikit-Learn) | Machine learning title similarity matrix and collaborative ranking engine        |
| packages/shared-types          | TypeScript                          | Transport-neutral contracts and DTO schemas shared across frontend & backend     |
| PostgreSQL 16                  | Relational Database                 | Authoritative system of record for users, movies, episodes, and settings         |
| Redis 7                        | In-Memory Data Store                | Caching, distributed rate limits, and Socket.IO multi-node clustering            |
| RabbitMQ 3                     | AMQP Message Broker                 | Distributed event queue for catalog ingestion, scraping, and cache purge         |
| OpenResty                      | Nginx + Lua Engine                  | Edge TLS termination, load balancing, reverse proxying, and WAF rules            |

## 2. End-to-End Request & Data Flow

```text
[ Client Browser / Mobile Viewer ]
               |
               v (HTTPS)
   [ Cloudflare Edge / WAF ]
               |
               v
  [ OpenResty Ingress Gateway ]
   |                        |
   +-- (Client SSR/BFF) ---> [ apps/web ] (Port 3000)
   |                             |
   |                             +--> [ TMDB CDN ] (Direct HD backdrops & posters)
   |                             +--> [ apps/api ] (User profiles, watch states)
   |
   +-- (Admin CMS) --------> [ apps/admin ] (Port 3002)
   |                             |
   |                             +--> [ apps/api ] (Administrative mutations)
   |                             +--> [ /api/provider-health ] (Automated probe telemetry)
   |
   +-- (Core API & Auth) --> [ apps/api ] (Port 3001)
   |                             |
   |                             +--> [ PostgreSQL ] (Prisma transactional client)
   |                             +--> [ Redis ] (Cache layers & tokens)
   |                             +--> [ RabbitMQ ] (Event publishing & task queues)
   |                             +--> [ recommendation-engine ] (Port 8000)
   |
   +-- (Stream Delivery) --> [ services/media-gateway ] (Port 8080)
                                 |
                                 +--> [ Upstream Movie CDNs ] (Manifest retrieval)
                                 +--> [ Redis Stream ] ----> [ services/media-worker-rs ]
```

## 3. Media Playback & HLS Streaming Engine

The video playback subsystem inside `apps/web` strictly complies with the ArtPlayer Editor official standard:

- Design: Theme color Cyan (#23ade5), native TV state icons, 10-second SVG circular arc seek indicators, and integrated quality selection within the native control bar.
- Multi-tier Transport Routing:
  - Priority 1: High-bandwidth Direct CDN streaming (eliminates middleman hops).
  - Priority 2: Cryptographically signed proxy fallback (`/api/hls-proxy` or `media-gateway`) upon encountering HTTP 404, CORS, or transport disconnects.
  - Priority 3: Sandboxed iframe fallback for isolated legacy video players.
- Opening Window Protection & Ad Filtering:
  - Opening Protection Rule: Discontinuities occurring within the opening 3 minutes (start < 180 seconds or start < skipIntroEnd) are strictly exempt from ad detection. This protects studio logos, distributor bumpers, and prologue scenes from accidental skips.
  - Spliced & Explicit Ad Cues: Ad breaks occurring at start >= 180 seconds are marked with standard Gold/Yellow indicators (#fbbf24), triggering an interactive countdown button and auto-skip capabilities.

## 4. Provider Health & Telemetry Engine

The administrative dashboard in `apps/admin` continuously audits stream accessibility:

- Probe Interval: Probed every 60 seconds through a server-side proxy route.
- Tracked Metrics: Upstream HTTP status codes, network latency in milliseconds, and HLS manifest integrity.
- Quota Management: Displays real-time daily usage for OMDb and TMDB APIs, reset countdowns, and hit ratios saved by in-memory caching.

## 5. Asynchronous Event Bus & Distributed Caching

1. RabbitMQ:
   - Exchange `movie.events` broadcasts movie additions and episode synchronizations.
   - Queue `movie.crawl.queue` balances ingestion jobs across background worker processes without affecting client response times.
   - Queue `movie.cache.invalidate` broadcasts cache eviction triggers to edge instances.

2. Redis:
   - Cache-Aside strategy prevents database saturation during traffic surges.
   - Socket.IO Redis Adapter coordinates multi-node real-time chat and Watch Party room synchronization.
   - Distributed Rate Limiter prevents API abuse using token-bucket counters per client IP.

## 6. Machine Learning Recommendation Service

The `services/recommendation-engine` operates independently using Python FastAPI and Scikit-Learn:

- Feature Engineering: Tokenizes genres, directors, actors, synopsis keywords, and production origins.
- Similarity Computation: Evaluates TF-IDF vector matrices and Cosine Similarities to identify closely matching titles.
- Trending Top 10: Merges TMDB rating metrics, weekly user engagement, and playback completions into a dynamically ranked trending row.

## 7. Data Ownership & Persistence Strategy

- PostgreSQL: The single authoritative source of truth for accounts, hashed credentials, viewing history, bookmarks, and notification state.
- Redis: Volatile and disposable by design; a temporary Redis outage must never compromise core PostgreSQL transactional consistency.
- TMDB: Only TMDB IDs are stored locally; image assets resolve directly from TMDB's edge delivery network to reduce server load.
- Shared Contracts (`@netphim/shared-types`): Pure TypeScript definitions without framework dependencies on React, NestJS, or Prisma.

## 8. Architectural Invariants & Failure Modes

1. Zero Direct Provider Calls from Browser: All third-party catalog calls must route through verified backend services to prevent IP leakage and client ad-blocker interference.
2. Signed Media Endpoints: HLS proxy endpoints must validate HMAC SHA-256 signatures with bounded TTLs. Query parameters must never be committed to centralized logs.
3. Graceful Degradation: Stream failures must cascade systematically: Direct CDN -> Signed Relay Proxy -> Alternate Server -> Sandboxed Iframe -> User Notification.
4. Schema Evolution: All relational schema modifications must proceed through versioned Prisma migrations, verified with automated unit and E2E test suites before deployment.
