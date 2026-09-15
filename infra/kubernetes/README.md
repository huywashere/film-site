# Kubernetes manifests (future expansion only)

> Trạng thái: **không được bật trên VPS hiện tại**. Production hiện chạy bằng
> Docker Compose với OpenResty. Thư mục này chỉ được giữ để chuẩn bị mở rộng
> sang cluster sau này và không được gọi từ CI/CD mặc định.

Hệ thống kiến trúc Kubernetes dành cho ứng dụng **FlexPhim** được thiết kế đáp ứng các tiêu chuẩn sản xuất (Production-Grade):

## 📂 Danh mục manifests trong `infra/kubernetes/`

1. `namespace.yaml`: Tạo không gian tên `netphim` cách ly các tài nguyên.
2. `configmap.yaml` chứa cấu hình công khai. Tạo `secret.yaml` chưa được theo dõi từ `secret.example.yaml`, hoặc ưu tiên External Secrets/Sealed Secrets. Không commit Secret đã điền giá trị.
3. `api-deployment.yaml`: Deployment và Service cho NestJS API.
4. `web-deployment.yaml`: Deployment và Service cho Next.js frontend.
5. `redis-deployment.yaml`: Redis cùng PersistentVolumeClaim.
6. `hpa.yaml`: Horizontal Pod Autoscaler.
7. `ingress.yaml`: Nginx Ingress và Cert-Manager.
8. `deploy.sh`: Script triển khai có khóa bảo vệ.

---

## ⚡ Hướng dẫn chạy thử nghiệm / Triển khai

### 1. Triển khai bằng 1 câu lệnh bash
```bash
ENABLE_K8S_DEPLOY=true IMAGE_TAG=<git-commit-sha> bash infra/kubernetes/deploy.sh
```

### 2. Kiểm tra trạng thái các Pods và Autoscaler
```bash
# Xem danh sách Pods
kubectl get pods -n netphim

# Xem trạng thái co giãn tự động (HPA)
kubectl get hpa -n netphim

# Xem thông tin bộ cân bằng tải Ingress & SSL
kubectl get ingress -n netphim
```
