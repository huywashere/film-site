import assert from "node:assert/strict";
import test from "node:test";

import { normalizeVsmovImages } from "../app/api/vsmov/[...path]/route";
import { resolveMovieApiOrigins } from "./movie-proxy";

test("movie origin pools keep safe HTTPS origins and known defaults", () => {
  const origins = resolveMovieApiOrigins(
    "https://api.example.com/,http://unsafe.example,https://user:pass@example.com,https://api.example.com",
    ["https://fallback.example.com"],
  );

  assert.deepEqual(origins, [
    "https://api.example.com",
    "https://fallback.example.com",
  ]);
});

test("VSMov normalization isolates malformed artwork fields", () => {
  const normalized = normalizeVsmovImages(
    {
      status: true,
      pathImage: "https://vsmov.com/storage/images/",
      items: [
        {
          slug: "valid",
          thumb_url: "thumb.jpg",
          poster_url: "poster.jpg",
        },
        {
          slug: "malformed-poster",
          thumb_url: "https://vsmov.com/storage/images/thumb-2.jpg",
          poster_url: {},
        },
      ],
    },
    "danh-sach/phim-moi-cap-nhat",
  );

  assert.equal(
    normalized.items[0].thumb_url,
    "https://vsmov.com/storage/images/thumb.jpg",
  );
  assert.equal(
    normalized.items[0].poster_url,
    "https://vsmov.com/storage/images/poster.jpg",
  );
  assert.equal(
    normalized.items[1].thumb_url,
    "https://vsmov.com/storage/images/thumb-2.jpg",
  );
  assert.equal(normalized.items[1].poster_url, "");
});
