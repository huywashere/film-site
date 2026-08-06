# 🚀 CineVerse - Terraform Infrastructure as Code (IaC)

Bộ mã nguồn tự động hóa 100% quy trình khởi tạo máy chủ VPS, cấu hình Domain Cloudflare CDN & Tường lửa Bảo mật cho hệ thống phim CineVerse.

---

### 📋 Hướng Dẫn Nhanh 3 Bước Chạy Terraform

#### 1️⃣ Tạo file cấu hình bí mật `terraform.tfvars`
Sao chép file mẫu và điền Token của bạn:
```bash
cp terraform.tfvars.example terraform.tfvars
```
Điền các giá trị:
- `do_token`: API Token tạo từ [DigitalOcean Control Panel](https://cloud.digitalocean.com/account/api/tokens).
- `cloudflare_api_token`: API Token tạo từ [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens).
- `cloudflare_zone_id`: Zone ID tên miền trong Cloudflare.
- `domain_name`: Tên miền chính của bạn (ví dụ: `cineverse.vn`).

#### 2️⃣ Khởi tạo Terraform
```bash
cd terraform
terraform init
```

#### 3️⃣ Xem trước & Khởi tạo Hạ Tầng Siêu Tốc
```bash
# Xem trước danh sách tài nguyên sắp được tạo
terraform plan

# Tạo toàn bộ Server, IP Tĩnh, Cloudflare DNS & Firewall trong 60 giây
terraform apply -auto-approve
```

---

### 🌟 Kết quả tự động thu được:
1. Máy chủ **Ubuntu 24.04 LTS (2 vCPU, 4GB RAM, 2GB Swap)** được khởi tạo tại Singapore (`sgp1`).
2. Tự động cài sẵn **Docker, Docker Compose, Git, UFW Firewall**.
3. **Cloudflare CDN** được bật sẵn đám mây màu cam (Proxy, Anti-DDoS, SSL Full/Strict).
4. Tường lửa khóa toàn bộ cổng nội bộ (PostgreSQL `5432`, Redis `6379`), chỉ mở cổng `80`, `443` và `22`.
