# Vận hành NetPhim Admin

## Chuẩn bị lần đầu

1. Tạo các secret riêng, ngẫu nhiên cho `JWT_SECRET`, `REVALIDATE_SECRET` và các biến xác thực khác trong `.env.vps`.
2. Chạy migration trước khi khởi động bản mới:

   ```bash
   docker compose run --rm api pnpm --filter api exec prisma migrate deploy
   ```

3. Nâng tài khoản NetPhim có email đã xác minh trùng với GitHub chủ sở hữu thành quản trị viên gốc bằng Prisma Studio hoặc PostgreSQL:

   ```sql
   UPDATE users
   SET role = 'ADMIN', "adminAccessEnabled" = true
   WHERE email = 'admin@example.com';
   ```

4. Đăng nhập trang người dùng và bật 2FA trong phần bảo mật tài khoản. Production luôn bắt buộc TOTP hoặc mã khôi phục và từ chối khởi động nếu cấu hình cố tắt 2FA.
5. Mở dashboard Admin ở cổng `3002` và đăng nhập bằng GitHub. Đăng nhập Admin bằng email/mật khẩu đã bị vô hiệu hóa hoàn toàn.

Admin sử dụng session riêng 12 giờ, token chỉ nằm trong cookie `HttpOnly`, không dùng chung token trình duyệt của client. Session được ràng buộc với User-Agent và IP; khi một trong hai thay đổi, API tự thu hồi session.

### Đăng nhập Admin bằng GitHub

1. Vào GitHub **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Với local, đặt callback là `http://localhost:3002/api/auth/github/callback`. Production dùng chính xác `https://admin.example.com/api/auth/github/callback`.
3. Cấu hình API:

   ```env
   GITHUB_ADMIN_CLIENT_ID=...
   GITHUB_ADMIN_CLIENT_SECRET=...
   ADMIN_GITHUB_CALLBACK_URL=http://localhost:3002/api/auth/github/callback
   ADMIN_GITHUB_ALLOWED_LOGINS=your-github-login
   ADMIN_GITHUB_ALLOWED_IDS=12345678
   ADMIN_REQUIRE_2FA=true
   ADMIN_SESSION_BIND_IP=true
   ```

4. Cấu hình dashboard với cùng `GITHUB_ADMIN_CLIENT_ID` và `ADMIN_GITHUB_CALLBACK_URL`; client secret chỉ đặt ở API, không đặt trong dashboard. Production chỉ chấp nhận đúng một ID số trong `ADMIN_GITHUB_ALLOWED_IDS`.
5. Email đã xác minh trên GitHub phải trùng email tài khoản Admin PostgreSQL. Lần đăng nhập đầu tiên sẽ liên kết `githubId`; hệ thống không tự tạo hoặc tự nâng quyền tài khoản.

Luồng sử dụng `state` chống CSRF, PKCE `S256`, chỉ yêu cầu `read:user user:email`, ràng buộc challenge 2FA với thiết bị/IP và luôn yêu cầu OTP NetPhim trên production.

## Vai trò và quyền mặc định

| Vai trò          | Phạm vi                                             |
| ---------------- | --------------------------------------------------- |
| `ADMIN`          | Toàn quyền                                          |
| `CONTENT_EDITOR` | CMS, đọc/tạo/sửa phim, cache                        |
| `OPERATIONS`     | Backup, cache, sự cố, playback, sync, analytics     |
| `ANALYST`        | Analytics, audit, đọc phim                          |
| `MODERATOR`      | Báo cáo, đánh giá, phòng xem chung và đọc analytics |
| `USER`           | Không được vào Admin                                |

Có thể cấp thêm quyền riêng cho từng tài khoản bằng trường `adminPermissions`. Không cấp `ADMIN` cho tài khoản dùng hằng ngày nếu chỉ cần một nhóm chức năng.

## Backup và khôi phục

- API dùng `pg_dump`/`pg_restore`; image production đã cài PostgreSQL client.
- File backup nằm trong `/app/backups`, được giữ bằng volume `backup_data` của Docker Compose.
- Mỗi file có trạng thái, dung lượng và SHA-256 trong database.
- Khôi phục yêu cầu chuỗi xác nhận `RESTORE <backup-id>`. Đây là thao tác phá hủy dữ liệu hiện tại; nên tạo thêm một backup mới trước khi restore.
- Không phục vụ file backup qua HTTP công khai. Hãy sao chép volume sang nơi lưu trữ mã hóa và kiểm tra restore định kỳ trên database thử nghiệm.

## Cảnh báo sự cố

Monitor kiểm tra PostgreSQL và Redis mỗi phút. Có thể cấu hình một hoặc cả hai kênh:

```env
ADMIN_ALERT_WEBHOOK_URL=https://example.com/netphim-alerts
TELEGRAM_ALERT_BOT_TOKEN=...
TELEGRAM_ALERT_CHAT_ID=...
```

Sự cố được lưu trong Admin, đồng thời tạo thông báo vận hành. Quản trị viên có quyền `incidents.manage` có thể xác nhận hoặc đánh dấu đã xử lý.

## Phim, dữ liệu trùng và lịch đồng bộ

- Trang **Dữ liệu & đồng bộ** cho phép tạo phim thủ công, xóa cứng bằng xác nhận `DELETE <slug>`, xem nhóm trùng và gộp bản ghi.
- Gộp phim giữ lại lịch sử xem, nguồn phát, đánh giá, review, lượt xem và metadata nguồn trước khi xóa bản trùng.
- Lịch sync dùng khoảng lặp theo phút, có thể bật/tắt, chạy tự động và lưu lần chạy gần nhất/lỗi gần nhất.

## CMS trang chủ

- Điều khiển hero, Top 10, thứ tự section, section bị ẩn, popup, thông báo, SEO và các hàng phim tùy chỉnh.
- Mẫu `homeFeaturedRows`:

  ```json
  {
    "de-cu": {
      "title": "NetPhim đề cử",
      "slugs": ["slug-phim-1", "slug-phim-2"],
      "href": "/films"
    }
  }
  ```

- ID tương ứng là `featured:de-cu`; thêm ID này vào thứ tự section hoặc danh sách ẩn khi cần. Nếu không thêm, hàng mới tự xuất hiện sau các section đã cấu hình.
- Lưu nội dung sẽ tăng `cacheVersion`. Nút revalidate gọi endpoint ký bằng `REVALIDATE_SECRET` để làm mới homepage ngay.

## Checklist deploy

- Không expose API, PostgreSQL, Redis hoặc Admin trực tiếp ra Internet; đặt Admin sau Cloudflare Access/VPN hoặc allowlist IP.
- Dùng cùng một `REVALIDATE_SECRET` ở API và web, nhưng không đặt secret này trong biến `NEXT_PUBLIC_*`.
- Kiểm tra volume `backup_data`, quyền ghi `/app/backups`, webhook cảnh báo và một lần restore thử trước khi coi backup là hoạt động.
- Sau deploy chạy smoke test: login Admin + 2FA, tạo/xóa lịch sync, tạo backup, purge một namespace cache, revalidate homepage và xem analytics.
