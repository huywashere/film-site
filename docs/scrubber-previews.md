# Scrubber preview sprites

FlexPhim prefers pre-generated WebVTT image sprites for timeline previews. The
main HLS stream is never seeked or decoded to render a sprite preview.

## Generate assets

Install `ffmpeg` and `ffprobe`, then run:

```powershell
pnpm preview:sprites -- --input "https://media.example/movie/master.m3u8" --output "D:\scrubber-previews"
```

The generator uses the SHA-256 hash of the exact stream URL as its directory
name and writes `index.vtt` plus 10x10 WebP sprite sheets. Pass `--key` only if
the ingestion pipeline already has a stable content key. The optional
`--interval` setting defaults to ten seconds and is clamped to at least five
seconds.

Upload the generated directory tree without renaming it to the preview CDN and
set:

```dotenv
NEXT_PUBLIC_SCRUBBER_PREVIEW_BASE_URL=https://preview-cdn.example.com
```

For Docker deployments this value is a build argument because `NEXT_PUBLIC_*`
variables are compiled into the browser bundle.

## CDN requirements

- Enable long-lived immutable caching for `.webp` files.
- Cache `.vtt` files and return `text/vtt; charset=utf-8`.
- Allow the FlexPhim origin with `Access-Control-Allow-Origin` so canvases can
  draw the sprite without becoming tainted.
- Query strings and fragments are removed before hashing so rotating URL
  signatures reuse the same preview. If the provider rotates the URL path, the
  ingestion pipeline should supply an explicit `thumbnailVttUrl` or
  `thumbnail_vtt` field instead of relying on the derived key.

If a valid sprite manifest is unavailable, the player retains the existing
low-resolution HLS seeker as a compatibility fallback.
