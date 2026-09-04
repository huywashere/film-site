import assert from "node:assert/strict";
import test from "node:test";
import {
  alternateMovieArtworkUrl,
  normalizeMovieArtworkUrl,
} from "./movie-image-url.ts";

test("keeps the current KKPhim uploads/movies path intact", () => {
  const current =
    "https://phimimg.com/uploads/movies/20260810/trong-khi-poster.webp";
  assert.equal(normalizeMovieArtworkUrl(current), current);
  assert.equal(
    alternateMovieArtworkUrl(current),
    "https://phimimg.com/upload/vod/20260810/trong-khi-poster.webp",
  );
});

test("keeps legacy upload/vod artwork intact and only derives an alternate", () => {
  const legacy =
    "https://phimimg.com/upload/vod/20240822-1/poster.jpg";
  assert.equal(normalizeMovieArtworkUrl(legacy), legacy);
  assert.equal(
    alternateMovieArtworkUrl(legacy),
    "https://phimimg.com/uploads/movies/20240822-1/poster.jpg",
  );
});

test("rejects literal undefined and null strings", () => {
  assert.equal(normalizeMovieArtworkUrl("undefined"), null);
  assert.equal(normalizeMovieArtworkUrl("null"), null);
  assert.equal(normalizeMovieArtworkUrl("none"), null);
  assert.equal(normalizeMovieArtworkUrl("   "), null);
  assert.equal(normalizeMovieArtworkUrl(undefined), null);
});

