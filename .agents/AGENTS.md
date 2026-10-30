# Rules for this Workspace

- **Không tự động commit hay push code:** Tuyệt đối không tự ý chạy lệnh `git commit` hoặc `git push` khi chưa có yêu cầu hay sự đồng ý rõ ràng từ người dùng. Mọi thay đổi code chỉ giữ ở working tree/staging để người dùng xem xét và xác nhận trước.
- **Không tự ý mở trình duyệt / chụp ảnh:** Tuyệt đối không tự ý mở trình duyệt (headless/DevTools) hoặc chụp ảnh màn hình khi chưa có yêu cầu hay sự cho phép rõ ràng từ người dùng.
- **Tối ưu UI & Layout trên điện thoại (Mobile First):** Luôn kiểm tra và đảm bảo giao diện, layout hiển thị mượt mà, chuẩn chỉ trên mobile; tính toán kỹ lưỡng typography, spacing, flex/grid để không xảy ra tình trạng lệch ảnh, đè chữ hay tràn viền trên các kích cỡ màn hình hẹp.

## Video Player Guidelines
- Video player must adhere strictly to the native ArtPlayer Editor standard (from https://artplayer.org/):
  - Use default theme `#23ade5`, native TV state icon, native controls layout, mini progress bar, and quality selector in control bar.
  - Do not introduce custom overlay drawers, locks, or CSS overrides that break ArtPlayer's official styling.
  - Seek controls (10s): Use modern circular arc SVG icons with crisp typography.
  - Timeline markers: Clear Cyan/Sky (`#23ade5`) for Intro with skip button; Amber/Gold (`#fbbf24`) for Ads with countdown skip.
  - Opening Window Protection: Never flag spliced stream discontinuities occurring in the opening window (first 180s or before skipIntroEnd) as ads unless an explicit ad URL is detected. Only recognize mid-roll/post-roll discontinuities (start >= 180s) as ads.

## Documentation Standards
- **Zero Emojis / Icons**: Never use emojis or decorative icons in `README.md` or any architectural/operational documentation in `docs/`. All documentation must maintain a clean, formal, engineering-standard presentation.

## Trailer & Media Artwork Guidelines
- **Trailer**: Prioritize official studio TMDB trailers (`official: true`, `type: "Trailer"`, `size >= 1080/2160`). Always embed via `https://www.youtube.com/embed/{key}?autoplay=1&rel=0&playsinline=1` with `referrerPolicy="strict-origin-when-cross-origin"` and proper allow permissions to ensure flawless playback without Error 153.
- **Episode Stills**: Query TMDB Season API (`/tv/{id}/season/{season_number}`) to fetch exact `still_path` for each episode to avoid duplicate thumbnail artwork.

## UI & Navigation Design Rules (Anti-Slop Standard)
- **Trang Chủ Đề (`/genres`)**:
  - Dành riêng cho 6 Vũ Trụ Điện Ảnh chủ đạo (Hàn Quốc, Trung Quốc, Anime, Khoa Học Viễn Tưởng, Chiến Tranh & Lịch Sử, Thuyết Minh Song Ngữ AI) kèm bảng xếp hạng Top 10 thịnh hành (icon `LayoutDashboard`).
  - Giữ bố cục tối giản, sang trọng chỉ với các khối Card Cinematic chủ đạo, không thêm thanh filter tab phụ dạng pill phía trên hay danh sách nút thể loại dàn trải phía dưới trừ khi có yêu cầu rõ ràng từ người dùng.
- **Trang Duyệt Tìm (`/films`)**:
  - Chức năng khám phá kho phim với hệ thống bộ lọc đa tầng (Thể loại, Quốc gia, Năm, Định dạng, Chất lượng, Âm thanh, Sắp xếp) và thanh tìm kiếm tức thời, có style dark cinematic đồng bộ 100% với trang chủ Home (icon `SlidersHorizontal`).
- **Lưới phim chuẩn 7 card/hàng (Desktop 7-Cols Standard)**:
  - Áp dụng chuẩn 7 card trên màn hình lớn (`2xl:grid-cols-7`) cho cả Trang Chủ và Trang Duyệt Tìm.
- **Thanh Tab Dọc (Sidebar)**:
  - **Trang chủ (`/`) & Các trang duyệt phim/thể loại/vũ trụ (`/genre/...`, `/country/...`, `/films/...`, `/genres`)**: Ẩn ở đầu trang khi xem Hero Banner; chỉ hiển thị (trượt vào) khi người dùng cuộn xuống phần thân trang (`body content`, `scrollY > ~380px`).
  - **Trang Xem phim (/watch/...), Giới thiệu phim (/film/...), Duyệt tìm (/films), Chủ đề (/genres), Lịch sử (/history), Bộ sưu tập (/watchlist)**: Luôn luôn hiển thị cố định (ghim ở trên ngay).

## Content & Media Standards
- **Mô tả phim**: Bắt buộc giải mã triệt để HTML entities qua `cleanMovieDescription`, tách đoạn rõ ràng (`\n\n`), fallback sang TMDB overview + tagline nếu nguồn phim thiếu hoặc placeholder.
- **Thư viện ảnh phim**: Luôn tích hợp mục hình ảnh liên quan (TMDB backdrops 16:9) ở cuối trang chi tiết kèm Lightbox toàn màn hình.
