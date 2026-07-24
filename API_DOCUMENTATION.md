# 📚 API Documentation - Movie Demo

Tài liệu API đầy đủ cho hệ thống xem phim.

## 🔗 Base URLs

- **Frontend Proxy**: `http://localhost:3000/api/kkphim`
- **Backend API**: `http://localhost:3001/api/v1`
- **KKPhim Direct**: `https://phimapi.com`

---

## 📋 Danh Sách Phim

### GET /danh-sach/phim-moi-cap-nhat

Lấy danh sách phim mới cập nhật

**Query Parameters:**

- `page` (number, optional): Trang hiện tại (default: 1)

**Response:**

```json
{
  "status": true,
  "items": [...],
  "pagination": {
    "totalItems": 29304,
    "totalItemsPerPage": 24,
    "currentPage": 1,
    "totalPages": 1221
  }
}
```

---

### GET /v1/api/danh-sach/phim-bo

Danh sách phim bộ

**Query Parameters:**

- `page` (number): Trang
- `limit` (number): Số phim mỗi trang (default: 24)
- `sort_field` (string): Trường sắp xếp (modified.time, year, _id)
- `sort_type` (string): Kiểu sắp xếp (desc, asc)

---

### GET /v1/api/danh-sach/phim-le

Danh sách phim lẻ

---

### GET /v1/api/danh-sach/hoat-hinh

Danh sách hoạt hình

---

### GET /v1/api/danh-sach/tv-shows

Danh sách TV Shows

---

### GET /v1/api/danh-sach (Lọc nâng cao)

Lọc phim theo nhiều tiêu chí

**Query Parameters:**

- `type` (string): phim-le, phim-bo, hoat-hinh, tv-shows
- `status` (string): trailer, ongoing, completed
- `category` (string): Slug thể loại
- `country` (string): Slug quốc gia
- `year` (number): Năm phát hành
- `page` (number): Trang
- `limit` (number): Số phim/trang
- `sort_field` (string): Trường sắp xếp
- `sort_type` (string): desc/asc

**Example:**

```
/v1/api/danh-sach?type=phim-bo&country=han-quoc&year=2026&page=1&limit=24
```

---

## 🎬 Chi Tiết Phim

### GET /phim/:slug

Lấy thông tin chi tiết phim (Old API)

**Example:** `/phim/tuoc-cot`

---

### GET /v1/api/phim/:slug

Lấy thông tin chi tiết phim (New API)

**Response:**

```json
{
  "status": true,
  "msg": "success",
  "movie": {
    "_id": "...",
    "name": "Tước Cốt",
    "slug": "tuoc-cot",
    "origin_name": "Key To The Phoenix Heart",
    "type": "series",
    "status": "ongoing",
    "thumb_url": "...",
    "poster_url": "...",
    "year": 2026,
    "content": "Nội dung phim...",
    "actor": ["Diễn viên 1", "Diễn viên 2"],
    "director": ["Đạo diễn"],
    "category": [{"name": "Hành Động", "slug": "hanh-dong"}],
    "country": [{"name": "Trung Quốc", "slug": "trung-quoc"}],
    "episode_current": "Tập 10",
    "episode_total": "40 Tập",
    "quality": "HD",
    "lang": "Vietsub",
    "episodes": [...]
  }
}
```

---

### GET /phim/id/:id

Lấy phim theo ID

---

### GET /phim/tmdb

Lấy phim theo TMDB ID

**Query Parameters:**

- `tmdb_id` (string, required)
- `type` (string, required): tv hoặc movie
- `season` (number, optional): Số season

**Example:** `/phim/tmdb?tmdb_id=295558&type=tv&season=1`

---

### GET /phim/imdb

Lấy phim theo IMDB ID

**Query Parameters:**

- `imdb_id` (string, required)

**Example:** `/phim/imdb?imdb_id=tt38973414`

---

## 📸 Thông Tin Bổ Sung

### GET /phim/images

Lấy hình ảnh từ TMDB

**Query Parameters:**

- `tmdb_type` (string): tv hoặc movie
- `tmdb_id` (string)

---

### GET /phim/cast

Lấy thông tin diễn viên

---

### GET /phim/keywords

Lấy từ khóa phim

---

## 🔍 Tìm Kiếm & Lọc

### GET /v1/api/tim-kiem

Tìm kiếm phim

**Query Parameters:**

- `keyword` (string, required)
- `page` (number)
- `limit` (number)

**Example:** `/v1/api/tim-kiem?keyword=spider&page=1&limit=24`

---

## 🎭 Thể Loại

### GET /the-loai

Lấy danh sách tất cả thể loại

**Response:**

```json
[
  {
    "name": "Hành Động",
    "slug": "hanh-dong"
  },
  {
    "name": "Viễn Tưởng",
    "slug": "vien-tuong"
  }
]
```

---

### GET /v1/api/the-loai/:slug

Lấy phim theo thể loại

**Example:** `/v1/api/the-loai/hanh-dong?page=1&limit=24`

---

## 🌍 Quốc Gia

### GET /quoc-gia

Lấy danh sách tất cả quốc gia

---

### GET /v1/api/quoc-gia/:slug

Lấy phim theo quốc gia

**Example:** `/v1/api/quoc-gia/han-quoc?page=1&limit=24`

---

## 📅 Năm Phát Hành

### GET /nam-phat-hanh

Lấy danh sách các năm

---

### GET /nam-phat-hanh/:year

Lấy phim theo năm

**Example:** `/nam-phat-hanh/2026?page=1&limit=24`

---

## 🔐 Authentication Endpoints (Backend Only)

### POST /api/v1/auth/register

Đăng ký tài khoản

**Body:**

```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123"
}
```

---

### POST /api/v1/auth/login

Đăng nhập

**Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {...}
}
```

---

### GET /api/v1/auth/me

Lấy thông tin user hiện tại (cần token)

---

## 📝 Reviews & Ratings

### GET /api/v1/reviews/movie/:movieId

Lấy reviews của một phim

---

### POST /api/v1/reviews

Tạo review mới (cần đăng nhập)

**Body:**

```json
{
  "movieId": "tuoc-cot",
  "content": "Phim hay!",
  "rating": 4.5
}
```

---

### POST /api/v1/ratings

Đánh giá phim (cần đăng nhập)

**Body:**

```json
{
  "movieId": "tuoc-cot",
  "score": 4.5
}
```

---

### GET /api/v1/ratings/movie/:movieId/average

Lấy rating trung bình của phim

---

## 📌 Watchlist

### GET /api/v1/watchlist

Lấy danh sách watchlist (cần đăng nhập)

---

### POST /api/v1/watchlist

Thêm phim vào watchlist

**Body:**

```json
{
  "movieId": "tuoc-cot",
  "movieData": {...}
}
```

---

### DELETE /api/v1/watchlist/:movieId

Xóa phim khỏi watchlist

---

### GET /api/v1/watchlist/check/:movieId

Kiểm tra phim có trong watchlist không

---

## 📊 Response Format

### Success Response

```json
{
  "status": true,
  "msg": "success",
  "data": {...}
}
```

### Error Response

```json
{
  "status": false,
  "msg": "error message",
  "statusCode": 404
}
```

---

## 🚀 Usage Examples

### Frontend (React/Next.js)

```typescript
import { movieApi, kkphimApi } from "@/lib/api";

// Lấy phim mới nhất
const { data } = await movieApi.getLatest(1);

// Tìm kiếm phim
const results = await kkphimApi.search("spider man", 1);

// Chi tiết phim
const movie = await kkphimApi.getDetail("tuoc-cot");

// Lọc phim
const filtered = await kkphimApi.getFiltered({
  type: "phim-bo",
  country: "han-quoc",
  year: 2026,
  page: 1,
});
```

### Backend (NestJS)

```typescript
// Trong controller
@Get('trending')
async getTrending() {
  return this.moviesService.getLatest(1);
}
```

---

## 📝 Notes

- Tất cả endpoints hỗ trợ CORS
- Rate limit: 100 requests/minute
- Cache TTL: 5-60 phút tùy endpoint
- Encoding: UTF-8
- Format: JSON

---

## 🔗 External Links

- [KKPhim Official](https://kkphim1.com/)
- [API Documentation](https://kkphim1.com/api-document)
- [Telegram Support](https://t.me/phimnguon)
