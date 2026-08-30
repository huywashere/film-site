# ⚡ NetPhim OpenResty Edge API Gateway

**OpenResty** là nền tảng Reverse Proxy & API Gateway siêu tốc dựa trên Nginx và ngôn ngữ LuaJIT.

## 🚀 Tính năng nổi bật đã tích hợp:

1. **Tường lửa Lua Edge WAF (`infra/openresty/lua/security.lua`)**:
   - Tự động lọc và chặn các truy vấn chứa mã độc SQL Injection, XSS Scripting ở tốc độ microsecond trước khi tới Backend NestJS.
   - Tự động bổ sung các Security Headers bảo mật (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`).
2. **Cân bằng tải và Keep-Alive (`infra/docker/nginx.conf`)**:
   - Quản lý tập trung kết nối mở tới `web` (Next.js 3000) và `api` (NestJS 3001).
3. **Giới hạn lưu lượng chống Spam (Rate Limiting)**:
   - Giới hạn 30 requests/giây cho API endpoints và 100 requests/giây cho Web frontend.

---

## ⚡ Hướng dẫn chạy bằng Docker
```bash
docker build -t netphim-openresty -f infra/openresty/Dockerfile .
docker run -d -p 80:80 --name openresty-gateway netphim-openresty
```
