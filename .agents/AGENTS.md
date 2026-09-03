# Rules for this Workspace

- **Không tự động push code:** Tuyệt đối không chạy lệnh `git push` tự động. Chỉ thực hiện push code lên GitHub khi có yêu cầu hoặc sự đồng ý rõ ràng từ người dùng.

## Video Player Guidelines
- Video player must adhere strictly to the native ArtPlayer Editor standard (from https://artplayer.org/):
  - Use default theme `#23ade5`, native TV state icon, native controls layout, mini progress bar, and quality selector in control bar.
  - Do not introduce custom overlay drawers, locks, or CSS overrides that break ArtPlayer's official styling.
  - Seek controls (10s): Use modern circular arc SVG icons with crisp typography.
  - Timeline markers: Clear Cyan/Sky (`#23ade5`) for Intro with skip button; Amber/Gold (`#fbbf24`) for Ads with countdown skip.

## Trailer & Media Artwork Guidelines
- **Trailer**: Prioritize official studio TMDB trailers (`official: true`, `type: "Trailer"`, `size >= 1080/2160`). Always embed via `https://www.youtube.com/embed/{key}?autoplay=1&rel=0&playsinline=1` with `referrerPolicy="strict-origin-when-cross-origin"` and proper allow permissions to ensure flawless playback without Error 153.
- **Episode Stills**: Query TMDB Season API (`/tv/{id}/season/{season_number}`) to fetch exact `still_path` for each episode to avoid duplicate thumbnail artwork.

## UI & Navigation Design Rules (Anti-Slop Standard)
- **Trang Duyệt Tìm (`/genres`)**:
  - Giữ bố cục tối giản, sang trọng chỉ với các khối Card Cinematic chủ đạo (5 vũ trụ điện ảnh: Hàn Quốc, Trung Quốc, Anime, Khoa Học Viễn Tưởng, Chiến Tranh & Lịch Sử), không thêm thanh filter tab phụ dạng pill phía trên hay danh sách nút thể loại dàn trải phía dưới trừ khi có yêu cầu rõ ràng từ người dùng.
- **Thanh Tab Dọc (Sidebar)**:
  - **Trang chủ (`/`) & Các trang duyệt phim/thể loại/vũ trụ (`/genre/...`, `/country/...`, `/films/...`, `/genres`)**: Ẩn ở đầu trang khi xem Hero Banner; chỉ hiển thị (trượt vào) khi người dùng cuộn xuống phần thân trang (`body content`, `scrollY > ~380px`).
  - **Trang Xem phim (`/watch/...`) & Giới thiệu phim (`/film/...`)**: Luôn luôn hiển thị cố định.
