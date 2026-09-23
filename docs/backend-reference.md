# FlexPhim Backend Reference

Tài liệu này mô tả backend đang tồn tại trong source code FlexPhim, được rà soát theo mã nguồn ngày 23/09/2026. Đây là tài liệu tra cứu chức năng; schema Prisma, controller và cấu hình runtime vẫn là nguồn sự thật cuối cùng khi có thay đổi.

## 1. Bức tranh tổng thể

| Thành phần | Công nghệ | Cổng local | Trách nhiệm chính |
| --- | --- | ---: | --- |
| `apps/api` | NestJS 11, Prisma 6 | 3001 | API nghiệp vụ, xác thực, người dùng, dữ liệu phim nội bộ, CMS, telemetry và WebSocket |
| `services/media-gateway` | Go, Gin | 8081 | Tổng hợp catalog nhiều nguồn, tìm kiếm, bootstrap phim, relay HLS ký số và provider health |
| `services/recommendation-engine` | Python, FastAPI, scikit-learn | 8000 | Top 10 và phim tương tự; đọc dữ liệu PostgreSQL |
| `services/media-worker-rs` | Rust, Tokio | 8091 nội bộ | Phân tích HLS bất đồng bộ, kiểm tra segment, marker quảng cáo/intro và health score |
| `apps/web/src/app/api` | Next.js Route Handlers | 3000 | BFF/proxy cùng origin cho catalog, TMDB, ảnh, trailer và HLS fallback |
| `apps/admin/src/app/api` | Next.js Route Handlers | 3002 | BFF bảo vệ phiên quản trị và chuyển tiếp yêu cầu tới NestJS API |
| PostgreSQL | PostgreSQL 16 | 5433 local | Nguồn dữ liệu bền vững chính |
| Redis/RediSearch | Redis Stack | 6379 | Cache, rate limit, lock, Socket.IO adapter, HLS analysis streams và tìm kiếm phụ trợ |
| Meilisearch | Meilisearch | 7700 | Chỉ mục tìm kiếm catalog chịu lỗi chính tả, có thể tái tạo |
| RabbitMQ | RabbitMQ | 5672/15672 | Job crawl và sự kiện xóa cache phân tán |
| Object storage | Local hoặc S3-compatible/R2 | — | Lưu HLS do quản trị viên tự tải lên |
| OpenResty/Cloudflare | Nginx Lua/Tunnel | 80/443 | Ingress, cache cạnh, bảo vệ origin và định tuyến production |

Prefix HTTP chính của NestJS là `/api/v1`. File media tự lưu local được phục vụ tại `/media/*`. Namespace Socket.IO xem chung là `/watch-party`.

## 2. Luồng dữ liệu chính

### 2.1 Duyệt, tìm kiếm và mở phim

1. Web gọi Go Media Gateway qua `/v1/home-feed`, `/v1/catalog`, `/v1/search` hoặc `/v1/movies/:slug/bootstrap`.
2. Gateway ưu tiên dữ liệu phim tự phát hành từ NestJS Core API rồi gọi song song KKPhim, OPhim, NguonC, VSMov và ViCDN.
3. Kết quả được chuẩn hóa, gộp bản trùng nhưng vẫn giữ `_sources` và `_sourceSlugs` để chuyển nguồn khi phát.
4. Gateway bổ sung artwork TMDB, cache Redis và cập nhật chỉ mục Meilisearch.
5. Khi Meilisearch chưa sẵn sàng, tìm kiếm quay về đường tổng hợp provider thay vì trả rỗng.

### 2.2 Tự tải phim riêng

1. Admin tạo metadata phim; phim mới được ẩn trong lúc chưa có nguồn phát.
2. `POST /api/v1/admin/media/uploads` nhận multipart video và tạo `MediaUploadJob`.
3. `MediaIngestService` dùng `ffprobe` đọc thông tin rồi dùng `ffmpeg` tạo adaptive HLS, không upscale video nguồn.
4. Các manifest/segment được lưu vào `.local-data/media` hoặc tải lên R2/S3-compatible storage.
5. Khi hoàn thành, backend tạo/cập nhật `MoviePlaybackSource`, đánh dấu nguồn hoạt động và bỏ ẩn phim.
6. Phim xuất hiện trong `/movies/published`, tìm kiếm Gateway và home feed như phim từ provider.

Giới hạn mặc định: một job transcode đồng thời, hai FFmpeg thread; mục tiêu là tránh tranh CPU với player/API.

### 2.3 Phát HLS và phân tích nguồn

1. Player ưu tiên URL trực tiếp nếu host được phép và trình duyệt phát được.
2. Khi cần relay, client dùng URL HLS có chữ ký HMAC và thời hạn tại `/api/hls-proxy`.
3. Go Gateway kiểm tra chữ ký, HTTPS/allowlist, DNS công khai, giới hạn redirect, kích thước và rate limit trước khi relay.
4. Manifest được rewrite để segment/key tiếp tục đi qua URL ký số; cache miss đồng thời được coalesce thành một upstream request.
5. Gateway đẩy job phân tích vào Redis Stream.
6. Rust worker chỉ lấy manifest và một số segment mẫu, tính duration, variant, encryption, marker và health score; worker không cắt hay sửa video.
7. Kết quả được cache trong Redis và đính kèm khi gọi `POST /v1/streams/resolve`.

### 2.4 Xác thực và phiên người dùng

1. NestJS hỗ trợ email/password, Google OAuth, Firebase và liên kết tài khoản Google.
2. Access/refresh token được tách secret; refresh token và phiên đăng nhập được lưu để có thể thu hồi từng thiết bị.
3. Email verification, reset password, cảnh báo thiết bị mới và khóa tài khoản đáng ngờ đi qua Mail/Auth service.
4. TOTP 2FA dùng encryption key riêng; admin GitHub OAuth có bước 2FA và ràng buộc IP trong production.

### 2.5 Xem chung

1. Client kết nối Socket.IO namespace `/watch-party`.
2. Người đăng nhập được xác thực bằng cookie JWT; khách nhận guest ID và reconnect token.
3. Host tạo phòng, người dùng tham gia/rời phòng, chat, reaction và đồng bộ play/pause/seek/episode.
4. Redis Socket.IO adapter cho phép nhiều API instance chia sẻ event; phòng đóng được lưu thành `WatchPartyArchive`.

## 3. NestJS Core API (`apps/api`)

### 3.1 Hạ tầng dùng chung

| Phần | Chức năng |
| --- | --- |
| `main.ts` | Khởi động app, prefix `/api/v1`, CORS, CSRF-origin check, Helmet, cookie parser, static media, validation, timeout và Redis Socket.IO adapter |
| `PrismaModule` | Kết nối PostgreSQL, pool timeout, slow-query logging và lifecycle |
| `RedisCacheModule` | Cache get/set/delete, distributed lock, thống kê namespace và RediSearch `FT.*` |
| `RabbitMQModule` | Topic exchange `netphim.events`, phát/nhận crawl job, movie update và cache invalidation |
| `StorageModule` | Upload/download/delete file bằng local storage hoặc S3 Signature V4 cho R2/S3-compatible |
| `ThrottlerModule` | Rate limit phân tán bằng Redis; mặc định 100 request/60 giây |
| `IpBlacklistGuard` | Chặn IP toàn cục theo rule trong database/cache |
| `TimeoutInterceptor` | Cắt request bị treo; upload multipart admin được phép chạy dài hơn |
| `env.validation.ts` | Fail-fast production khi secret yếu/thiếu, URL không HTTPS, S3 cấu hình dở dang hoặc admin OAuth không an toàn |
| Sentry | Ghi lỗi/tracing khi có `SENTRY_DSN` |

### 3.2 Module nghiệp vụ và endpoint

Mọi đường dẫn dưới đây có prefix `/api/v1`.

#### `AuthModule` — `/auth`

- `POST /register`, `/login`, `/refresh`, `/logout`: vòng đời tài khoản và token.
- `GET /google`, `/google/callback`: đăng nhập Google.
- `GET /google/link`, `/google/link/callback`: liên kết Google với tài khoản hiện có.
- `POST /firebase`: xác thực Firebase ID token phía server.
- `POST /verify-email`, `/forgot-password`, `/reset-password`: xác minh và khôi phục tài khoản.
- `GET /sessions`, `POST /sessions/:id/revoke`, `/sessions/revoke-all`: quản lý thiết bị/phiên.
- `GET /me`, `PUT /change-password`: thông tin tài khoản và đổi mật khẩu.
- `POST /2fa/setup`, `/2fa/verify`, `/2fa/disable`, `/2fa/login-verify`: TOTP 2FA.
- `GET|POST /lock-account`: khóa tài khoản từ suspicious token.

#### `UsersModule` — `/users`

- Hồ sơ công khai, hoạt động gần đây, thống kê và leaderboard.
- Cập nhật hồ sơ của chính người dùng.
- Đọc/ghi lịch sử xem tương thích client cũ.
- Đọc/thêm/xóa watchlist; hỗ trợ cursor pagination.

#### `MoviesModule` — `/movies`

- Catalog: `/latest`, `/series`, `/single`, `/anime`, `/tvshows`, `/filtered`.
- Phim nội bộ: `/published`, `/published-search`.
- Xu hướng: `/trending`; ghi view có JWT tại `POST /:slug/view`.
- Chi tiết: `/detail/:slug`, `/detail-v1/:slug`, `/by-id/:id`, route động `/:slug`.
- Định danh ngoài: `/by-tmdb`, `/by-imdb`.
- Metadata TMDB: `/images`, `/cast`, `/keywords`.
- Tìm kiếm: `/search`, `/vidsrc/search`, `/vidsrc/detail/:slug`.
- Taxonomy: `/genres`, `/genre/:slug`, `/countries`, `/country/:slug`, `/years`, `/year/:year`.
- Service hợp nhất phim PostgreSQL với provider, cache metadata và đẩy tài liệu vào search index.

#### `WatchHistoryModule` — `/watch-history`

- Upsert tiến độ/tập đang xem.
- Danh sách lịch sử có pagination/cursor.
- Resume theo movie ID.
- Xóa một mục hoặc xóa toàn bộ lịch sử.
- Toàn bộ route yêu cầu JWT.

#### `WatchlistModule` — `/watchlist`

- Danh sách đã lưu, thêm, xóa và kiểm tra một phim có trong danh sách hay chưa.
- Toàn bộ route yêu cầu JWT.

#### `ReviewsModule` — `/reviews`

- Đọc review gần đây hoặc theo phim ở chế độ public.
- Đọc review của tôi, tạo, xóa và like/unlike bằng JWT.
- Có throttle riêng chống spam review/like.

#### `RatingsModule` — `/ratings`

- Chấm điểm/upsert điểm người dùng.
- Đọc điểm trung bình của phim.
- Đọc điểm của người dùng hiện tại.

#### `RecommendationsModule` — `/recommendations`

- `GET /top10`: Top 10, có cache Redis theo user.
- `GET /similar/:slug`: phim tương tự, cache theo slug/limit.
- Ưu tiên Python engine; nếu engine lỗi thì fallback truy vấn PostgreSQL theo phim mới hoặc giao thể loại.

#### `WatchPartyModule` — Socket.IO `/watch-party`

- Event vào: `rooms:list`, `room:create`, `room:join`, `room:leave`, `chat:send`, `reaction:send`, `player:state`.
- Event ra: `rooms:changed`, `room:snapshot`, `chat:message`, `reaction`, `player:state`.
- Rate limit riêng cho tạo/join/chat/reaction/player và cửa sổ reconnect 15 giây.

#### `ReportsModule` — `/contact`, `/reports`

- Contact công khai tạo `IssueReport` và thông báo cho admin.
- Báo lỗi của người dùng đã đăng nhập lưu reporter, trạng thái, mức ưu tiên và lịch sử xử lý.

#### `AdsModule` — `/ads`

- Đọc quảng cáo đang hoạt động theo vị trí/category.
- Ghi impression và click đã xác thực.
- CRUD/toggle quảng cáo được admin sử dụng qua `AdminModule`.

#### `SystemNotificationsModule` — `/system-notifications`

- Trả thông báo hệ thống công khai đang hoạt động, đúng lịch và đúng audience.
- CRUD/toggle nằm trong admin API.

#### `SiteConfigModule` — `/config`

- `GET /public` trả phần cấu hình website được phép công khai.
- Cấu hình đầy đủ, revision và restore chỉ đi qua admin API.

#### `TelemetryModule` — `/telemetry`

- `POST /client`, `/client/batch`: nhận telemetry từ khách hoặc người đăng nhập; nếu JWT hợp lệ thì gắn user ID.
- `GET /metrics`: snapshot Web Vitals/API/Redis/memory, bắt buộc `X-Admin-Metrics-Token`.

#### `HealthModule` — `/health`

- `GET /health`: kiểm tra PostgreSQL và heap memory.
- `GET /health/ping`: liveness nhẹ.

#### `MailModule`

- Gửi email xác minh, reset mật khẩu và cảnh báo đăng nhập thiết bị mới.

#### `AuditService`

- Ghi actor, action, entity, metadata, IP và user-agent cho thao tác quản trị nhạy cảm.

### 3.3 Admin API

`AdminModule` được chia thành các nhóm sau; route quản trị yêu cầu admin session và permission guard.

| Nhóm | Chức năng |
| --- | --- |
| `/admin-auth/*` | GitHub OAuth, bước 2FA, lấy admin hiện tại, logout và thu hồi session |
| `/admin/stats`, `/analytics/advanced` | Tổng quan KPI, user/movie/view, search analytics, playback analytics |
| `/admin/movies*` | Tạo phim, phân trang, metadata, nguồn, visibility, playback source, tìm/gộp bản trùng, xóa có confirmation |
| `/admin/media/uploads` | Nhận video, theo dõi job FFmpeg/HLS và phát hành nguồn tự lưu |
| `/admin/movies/sync`, `/sync-jobs*` | Tạo, chạy lại và theo dõi job đồng bộ provider |
| `/admin/sync/schedules*` | Lịch crawl tự động, bật/tắt, chạy ngay và thống kê |
| `/admin/users*` | Tìm user, chi tiết, ban, role, lock, verification, session và reset 2FA |
| `/admin/reports*` | Danh sách, chi tiết, trạng thái và phản hồi issue/contact |
| `/admin/reviews*` | Danh sách, moderation và xóa review |
| `/admin/watch-parties*` | Phòng đang chạy, archive và đóng phòng |
| `/admin/configuration*` | Cấu hình site, lưu revision và restore revision |
| `/admin/notifications*` | Thông báo nội bộ admin và trạng thái đã đọc |
| `/admin/system-notifications*` | CRUD/toggle thông báo hiển thị cho người dùng |
| `/admin/ads*` | CRUD/toggle chiến dịch/quảng cáo |
| `/admin/security/*` | IP bị chặn, IP đáng ngờ, block/unblock |
| `/admin/backups*` | Danh sách, yêu cầu backup và restore có confirmation |
| `/admin/incidents*` | Sự cố hệ thống, acknowledge/resolve |
| `/admin/cache*` | Thống kê namespace, purge có kiểm soát và revalidate web |
| `/admin/system` | Health của DB, Redis, provider và dịch vụ liên quan |
| `/admin/operations/prune-logs` | Dọn log hết hạn theo retention |

## 4. Go Media Gateway (`services/media-gateway`)

### 4.1 Catalog API

| Endpoint | Chức năng |
| --- | --- |
| `GET /v1/home-feed` | Snapshot trang chủ đã cache; có stale fallback |
| `GET /v1/catalog` | Catalog theo `kind`, `value`, page, limit và filter |
| `GET /v1/search` | Tìm kiếm chuẩn hóa/deduplicate; Meilisearch rồi provider fallback |
| `GET /v1/top10` | View analytics từ Core API và catalog fallback |
| `GET /v1/movies/:slug/bootstrap` | Một response chứa detail, episode server, source slug và playback bootstrap |
| `GET /v1/catalog/providers/health` | Circuit state và độ trễ từng provider |
| `GET /v1/search/status` | Trạng thái index, queue, full sync và lỗi gần nhất |
| `POST /v1/search/documents/delete` | Xóa tài liệu search theo canonical key; yêu cầu `X-Internal-Token` |

Gateway gọi các nguồn KKPhim, OPhim, NguonC, VSMov và ViCDN qua origin pool, timeout, retry và circuit breaker. Dữ liệu phim tự upload từ NestJS được đặt ưu tiên cao hơn provider ngoài.

### 4.2 Media API

| Endpoint | Quyền | Chức năng |
| --- | --- | --- |
| `GET /healthz` | Public nội bộ | Liveness |
| `GET /readyz` | Public nội bộ | Readiness gồm Redis manifest store |
| `GET /api/hls-proxy` | URL ký số | Relay manifest, segment, key và Range request |
| `POST /v1/streams/resolve` | Internal token | Trả direct URL, signed proxy URL và analysis đã cache |
| `GET /v1/providers/health` | Internal token | Metrics host/provider |
| `GET /metrics` | Internal token | Prometheus metrics |
| `/v1/analysis/*` | Internal token | Enqueue và đọc status/result phân tích HLS |

Các lớp bảo vệ gồm URL allowlist, chống SSRF/DNS private IP, HMAC expiry, request/body limit, retry hữu hạn, trusted proxy và rate limit riêng cho media/catalog.

## 5. Python Recommendation Engine

| Endpoint | Chức năng |
| --- | --- |
| `GET /health` | Trạng thái model, số phim đã index |
| `GET /recommendations/top10` | Xếp hạng top phim, có tùy chọn user ID |
| `GET /recommendations/similar/:slug` | Content similarity và co-watch |
| `POST /recommendations/retrain` | Train lại model; cần `X-Recommendation-Admin-Token` |

Engine đọc phim, view log, rating và watch history từ PostgreSQL. Feature gồm thể loại, quốc gia, diễn viên, đạo diễn và nội dung; ranking kết hợp TF-IDF/cosine, độ phổ biến, rating và hành vi xem. Nếu service này dừng, NestJS vẫn trả fallback từ database.

## 6. Rust HLS Analyzer

- Đọc job từ Redis Stream `netphim:hls:analysis:jobs`, consumer group `hls-analyzers`.
- Kiểm tra URL/allowlist, tải manifest có giới hạn và parse master/media playlist.
- Lấy mẫu tối đa số segment cấu hình, không tải cả phim.
- Tạo duration, variants, broken segments, encryption, discontinuity, intro/ad markers và `healthScore`.
- Ghi kết quả vào stream `netphim:hls:analysis:results` và key cache `netphim:hls:analysis:v1:<sha256-url>`.
- Job lỗi vĩnh viễn đi vào dead-letter stream; lỗi tạm thời retry có backoff/jitter.
- `XAUTOCLAIM` nhận lại job bị worker chết; health/ready/Prometheus chạy ở cổng nội bộ 8091.

Hợp đồng job/result version 1 nằm trong `packages/shared-types/contracts` và được kiểm tra bởi cả Go/Rust tests.

## 7. Next.js backend-for-frontend

### 7.1 Web BFF (`apps/web/src/app/api`)

| Route | Chức năng |
| --- | --- |
| `/api/catalog-gateway/*` | Bridge cùng origin tới Go Gateway |
| `/api/kkphim/*`, `/ophim/*`, `/nguonc/*`, `/vsmov/*`, `/vicdn/*` | Provider proxy dùng cache, timeout, origin fallback và circuit breaker chung |
| `/api/tmdb/*` | Proxy metadata TMDB, giữ API key ở server và cache response |
| `/api/omdb` | OMDb lookup và fallback mapping từ TMDB |
| `/api/image-proxy` | Ảnh provider có allowlist, mirror fallback, cache và giới hạn upstream |
| `/api/cast-image` | Resolve ảnh diễn viên từ cache/TMDB/Wikipedia |
| `/api/actor-films` | Hồ sơ diễn viên và danh sách phim qua TMDB/provider mapping |
| `/api/hls-proxy` | Relay HLS fallback tương thích chữ ký với Go Gateway |
| `/api/nguonc/resolve-stream` | Resolve stream từ embed NguonC |
| `/api/trailer/resolve` | Tìm và lọc trailer chính thức |
| `/api/vidsrc/*` | Metadata/embed VidSrc đã kiểm soát |
| `/api/admin/revalidate` | Revalidate cache web bằng secret |
| `/api/health` | Health của web/BFF |
| `/api/learning-demo/*` | Demo học tập; bị vô hiệu hóa trong production |

`apps/web/src/lib/movie-proxy.ts` là hạ tầng chung cho proxy provider: xác thực origin/path, Redis + memory fallback, TTL theo route, timeout, stale response và circuit breaker.

### 7.2 Admin BFF (`apps/admin/src/app/api`)

| Route | Chức năng |
| --- | --- |
| `/api/admin/*` | Chuyển tiếp GET/POST/PATCH/DELETE tới NestJS, giữ cookie; upload được stream không buffer |
| `/api/auth/github/start` | Tạo GitHub OAuth authorize URL/state |
| `/api/auth/github/callback` | Đổi code qua Core API, thiết lập bước login/2FA |
| `/api/auth/github/complete` | Hoàn tất admin 2FA và đặt cookie phiên |
| `/api/auth/logout` | Logout Core API và xóa cookie |
| `/api/performance` | Đọc telemetry metrics bằng token server-side |
| `/api/provider-health` | Kiểm tra provider thông qua web proxy và tổng hợp latency/quota |

## 8. Database PostgreSQL

### 8.1 Identity và bảo mật

- `User`: tài khoản, vai trò, profile, trạng thái ban/lock/verify và provider identity.
- `AdminSession`: phiên quản trị, IP binding, expiry và revoke.
- `TwoFactorAuth`: secret TOTP đã mã hóa và trạng thái bật.
- `RefreshToken`: phiên/refresh token theo thiết bị.
- `VerificationToken`, `ResetPasswordToken`: token một lần có hạn.
- `Follow`: quan hệ theo dõi giữa người dùng.
- `IpBlockRule`: block IP/CIDR, lý do, người tạo và expiry.

### 8.2 Catalog và playback

- `Movie`: metadata chuẩn hóa, IMDb ID, poster/thumb URL, taxonomy và visibility. Schema hiện tại chưa có cột riêng cho TMDB ID, backdrop path hoặc logo path; enrichment TMDB chủ yếu nằm ở Gateway/BFF và cache.
- `MoviePlaybackSource`: provider/server/episode, URL HLS/embed, health, priority và metadata nguồn.
- `MediaUploadJob`: trạng thái upload/probe/transcode/upload/publish, progress, lỗi, manifest và actor.
- `ViewLog`: lượt xem chuẩn hóa phục vụ trending/analytics.
- `PlaybackEvent`: start, buffering, error, source switch và các số liệu player.
- `SearchEvent`: query, latency, result count và selection phục vụ chất lượng tìm kiếm.

### 8.3 Tương tác người dùng

- `WatchHistory`, `Watchlist`, `Review`, `ReviewLike`, `Rating`.
- `UserNotification`, `MovieSubscription`, `UserPreference`.
- `Playlist`, `PlaylistItem`.
- `WatchPartyArchive`.

### 8.4 Quản trị và vận hành

- `AuditLog`: nhật ký thao tác admin.
- `IssueReport`, `IssueReportEvent`: contact/báo lỗi và lịch sử xử lý.
- `SyncJob`, `SyncSchedule`: crawl/sync thủ công và định kỳ.
- `DatabaseBackup`: metadata backup/restore.
- `SystemIncident`: sự cố và vòng đời xử lý.
- `SiteConfiguration`, `SiteConfigurationRevision`: cấu hình có version/rollback.
- `AdminNotification`, `AdminNotificationRead`: thông báo riêng admin.
- `SystemNotification`: thông báo cho người dùng.
- `AdPlacement`: nội dung, vị trí, lịch, targeting và số liệu quảng cáo.

Các enum chính: `Role`, `BackupStatus`, `IncidentStatus`, `IssueStatus`, `IssuePriority`, `SyncJobStatus`, `MediaUploadStatus`, `AdType`, `NotificationType`.

## 9. Cache, search và message broker

### Redis

- Cache phim, home feed, recommendations và metadata.
- Distributed throttling và distributed lock.
- RediSearch index phụ trong Core API.
- Socket.IO pub/sub giữa nhiều instance.
- Manifest cache và Redis Streams cho HLS analysis.
- Dữ liệu Redis được xem là có thể tái tạo; PostgreSQL vẫn là nguồn dữ liệu bền vững.

### Meilisearch

- Index `movies`, typo tolerance, Vietnamese/original/compact aliases.
- Warmup, incremental sync và full sync định kỳ.
- Chỉ prune stale khi scan catalog hoàn chỉnh để provider lỗi không làm mất dữ liệu hợp lệ.

### RabbitMQ

- Exchange: `netphim.events`.
- Queue `netphim.crawl.queue`: thực thi `SyncJob`.
- Queue `netphim.cache.invalidation.queue`: xóa cache sau movie update.
- Routing key chính: `movie.crawl.requested`, `movie.updated`, `movie.created`, `cache.invalidate`, `telemetry.log`.

## 10. Hạ tầng triển khai

Production Compose gồm PostgreSQL, PgBouncer, Redis, Meilisearch, RabbitMQ, Recommendation Engine, NestJS API, Web, Go Gateway, Rust Worker, OpenResty và Cloudflare Tunnel.

- PgBouncer giới hạn connection fan-out tới PostgreSQL.
- OpenResty là reverse proxy/cache/security layer; media gateway không nên public trực tiếp.
- Cloudflare Tunnel che origin VPS khi được cấu hình `TUNNEL_TOKEN`.
- Prisma migration chạy bằng `DIRECT_DATABASE_URL` trước khi restart service.
- Kubernetes manifests hiện bao phủ web, API, Redis, ingress, network policy và HPA; cần giữ parity với Compose nếu chọn Kubernetes làm môi trường chính.
- Terraform quản lý VPS, firewall và Cloudflare resources.
- Prometheus rules theo dõi media error rate, latency, queue và worker health.

## 11. Bảo mật bắt buộc

- Production không khởi động nếu thiếu hoặc dùng secret yếu cho JWT, refresh, TOTP, admin metrics, revalidate, HLS proxy và recommendation admin.
- `JWT_SECRET`, `JWT_REFRESH_SECRET` và `TOTP_ENCRYPTION_KEY` phải độc lập.
- `API_PUBLIC_URL`, admin OAuth callback và public object-storage URL phải dùng HTTPS trong production.
- Cấu hình S3/R2 phải đủ endpoint, bucket, access key, secret và public URL; không chấp nhận cấu hình một phần.
- Admin production bắt buộc GitHub allowlist, 2FA và IP binding.
- Mutating cookie request có origin check; bearer request không phụ thuộc cookie CSRF protection.
- Không đưa secret vào biến `NEXT_PUBLIC_*`, source code hoặc log.

## 12. Khởi động và kiểm tra local

Chạy toàn stack:

```powershell
cmd /c start-all.bat
```

Kiểm tra readiness độc lập:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-local-stack.ps1
```

Các URL local:

- Web: `http://localhost:3000`
- API: `http://localhost:3001/api/v1/health`
- Admin: `http://localhost:3002`
- Recommendation: `http://localhost:8000/health`
- Gateway: `http://localhost:8081/readyz`
- Meilisearch: `http://localhost:7700/health`
- RabbitMQ management: `http://localhost:15672`

Các lệnh kiểm tra quan trọng:

```powershell
pnpm --filter api build
pnpm --filter api test -- --runInBand
pnpm --filter web test:unit
pnpm --filter web build
pnpm --dir apps/admin build
go test ./...
pnpm --filter api exec prisma migrate status --schema prisma/schema.prisma
```

Chạy `go test ./...` từ `services/media-gateway`. Rust worker có thể chạy/test qua Docker profile `media-analysis` nếu máy không cài Rust.

## 13. Vị trí source cần biết

| Nhu cầu | File/thư mục chính |
| --- | --- |
| Thêm module API | `apps/api/src/app.module.ts`, `apps/api/src/<module>` |
| Sửa database | `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations` |
| Sửa upload/transcode | `apps/api/src/admin/media-ingest.service.ts` |
| Sửa object storage | `apps/api/src/common/storage/storage.service.ts` |
| Sửa catalog/search | `services/media-gateway/internal/catalog` |
| Sửa HLS relay | `services/media-gateway/internal/gateway`, `internal/hls`, `internal/security` |
| Sửa HLS analyzer | `services/media-worker-rs/src` |
| Sửa recommendation | `services/recommendation-engine` |
| Sửa provider proxy web | `apps/web/src/lib/movie-proxy.ts`, `apps/web/src/app/api/*` |
| Sửa admin BFF | `apps/admin/src/app/api` |
| Sửa deployment | `infra/docker`, `infra/openresty`, `infra/kubernetes`, `infra/terraform` |
| Sửa shared contract | `packages/shared-types` |
