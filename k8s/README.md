# ☸️ CineVerse Production Kubernetes Architecture & Manifests

Hệ thống kiến trúc Kubernetes dành cho ứng dụng **CineVerse** được thiết kế đáp ứng các tiêu chuẩn sản xuất (Production-Grade):

## 📂 Danh mục File Manifests trong `k8s/`

1. **[namespace.yaml](file:///c:/Project_Movie_Site/k8s/namespace.yaml)**: Tạo không gian tên `cineverse` cách ly các tài nguyên.
2. `configmap.yaml` chứa cấu hình công khai. Tạo `secret.yaml` chưa được theo dõi từ `secret.example.yaml`, hoặc ưu tiên External Secrets/Sealed Secrets. Không commit Secret đã điền giá trị.
3. **[api-deployment.yaml](file:///c:/Project_Movie_Site/k8s/api-deployment.yaml)**: Deployment & Service cho NestJS API (2 replicas mặc định, Liveness/Readiness Probes, Zero-downtime rolling update).
4. **[web-deployment.yaml](file:///c:/Project_Movie_Site/k8s/web-deployment.yaml)**: Deployment & Service cho Next.js Web App Frontend.
5. **[redis-deployment.yaml](file:///c:/Project_Movie_Site/k8s/redis-deployment.yaml)**: Cụm Redis Cache kèm PersistentVolumeClaim (PVC 5GB).
6. **[hpa.yaml](file:///c:/Project_Movie_Site/k8s/hpa.yaml)**: Tự động co giãn (Horizontal Pod Autoscaler) từ 2 lên 10 Pods khi CPU > 70% hoặc Memory > 80%.
7. **[ingress.yaml](file:///c:/Project_Movie_Site/k8s/ingress.yaml)**: Bộ cân bằng tải Nginx Ingress Controller & tự động gia hạn SSL/TLS Cert-Manager (Let's Encrypt).
8. **[deploy.sh](file:///c:/Project_Movie_Site/k8s/deploy.sh)**: Script triển khai 1-click.

---

## ⚡ Hướng dẫn chạy thử nghiệm / Triển khai

### 1. Triển khai bằng 1 câu lệnh bash
```bash
IMAGE_TAG=<git-commit-sha> bash k8s/deploy.sh
```

### 2. Kiểm tra trạng thái các Pods và Autoscaler
```bash
# Xem danh sách Pods
kubectl get pods -n cineverse

# Xem trạng thái co giãn tự động (HPA)
kubectl get hpa -n cineverse

# Xem thông tin bộ cân bằng tải Ingress & SSL
kubectl get ingress -n cineverse
```
