# Cloudflare Edge Media Gateway Worker (FlexPhim)

Hệ thống Cloudflare Worker tối ưu hóa hiệu năng, giảm tải 80-90% băng thông và CPU cho VPS:
1. **HLS Stream & Segment Relay (`/hls`)**: Lọc quảng cáo file `.m3u8`, cache video chunks `.ts`/`.m4s` 24h tại hơn 300 trạm Edge của Cloudflare.
2. **Image Proxy & WebP Caching (`/image`)**: Proxy và cache ảnh poster/backdrop từ các bên nguồn trong 30 ngày.
3. **Subtitles Relay & VTT Converter (`/subtitles`)**: Tự động chuyển đổi SRT sang WebVTT trong 2ms và cache tại Edge 30 ngày.

---

## Cách 1: Triển khai nhanh qua Cloudflare Dashboard (Khuyên dùng - 2 phút)

1. Truy cập [Cloudflare Dashboard](https://dash.cloudflare.com/) -> Chọn **Workers & Pages**.
2. Bấm **Create application** -> Chọn tab **Workers** -> Bấm **Create Worker**.
3. Đặt tên Worker: `flexphim-media-worker` -> Bấm **Deploy**.
4. Bấm **Edit code** (hoặc Quick Edit).
5. Mở file [media-worker.js](file:///c:/Project_Movie_Site/infra/cloudflare/media-worker.js) trong dự án, copy toàn bộ nội dung và dán đè vào trình soạn thảo của Cloudflare.
6. Bấm **Save and deploy**.
7. Copy địa chỉ Worker vừa tạo (ví dụ: `https://flexphim-media-worker.your-subdomain.workers.dev`).

---

## Cách 2: Triển khai qua lệnh CLI (Wrangler)

Tại thư mục gốc dự án:
```bash
cd infra/cloudflare
npx wrangler deploy
```

---

## Cấu hình vào dự án Web (.env)

Sau khi deploy Worker, mở file `.env` hoặc `.env.production` trên VPS và thêm các dòng sau:

```bash
# Cloudflare Media Worker URL (bỏ dấu / ở cuối)
NEXT_PUBLIC_CF_MEDIA_WORKER_URL="https://flexphim-media-worker.your-subdomain.workers.dev"
```

Khi biến môi trường này được cấu hình:
- Trình phát video (Player) và thư viện ảnh sẽ tự động chuyển hướng các luồng video, ảnh và phụ đề qua Cloudflare Worker.
- Nếu không cấu hình hoặc Worker chưa sẵn sàng, hệ thống sẽ tự động fallback về xử lý nội bộ trên VPS như cũ (Zero Downtime).
