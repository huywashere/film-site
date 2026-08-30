# NetPhim infrastructure

Terraform trong thư mục này chỉ quản lý:

- DigitalOcean VPS và IP tĩnh;
- DigitalOcean Firewall cùng UFW chỉ cho phép SSH từ CIDR quản trị;
- HTTP/HTTPS từ dải IP Cloudflare;
- DNS proxied và thiết lập TLS/WAF cơ bản của Cloudflare.

Ứng dụng, PostgreSQL, Redis, Gin media gateway và OpenResty được chạy bằng
Docker Compose. Kubernetes không thuộc luồng deploy VPS hiện tại.

## Chuẩn bị

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
```

Điền token thật, Zone ID, SSH public key, domain và IP public quản trị dạng
`x.x.x.x/32`. `terraform.tfvars` đã bị Git bỏ qua, tuyệt đối không commit file
này.

## Kiểm tra trước khi tạo tài nguyên

```bash
terraform fmt -check -recursive
terraform init
terraform validate
terraform plan -out=netphim.tfplan
```

Đọc kỹ plan vì Droplet và Reserved IP phát sinh chi phí. Chỉ sau đó mới chạy:

```bash
terraform apply netphim.tfplan
```

## TLS origin

OpenResty tự tạo chứng chỉ bootstrap tự ký nếu `ssl/fullchain.pem` và
`ssl/privkey.pem` chưa tồn tại. Vì vậy lần đầu để `cloudflare_ssl_mode = "full"`.
Sau khi đặt Cloudflare Origin CA certificate vào hai đường dẫn trên, đổi thành
`"strict"` và chạy lại `terraform apply`.

Cloudflare proxy không thay thế firewall origin. Không thêm DNS-only record trỏ
về IP VPS và không mở cổng 80/443 cho toàn Internet.
