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


