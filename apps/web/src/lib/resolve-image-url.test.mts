import assert from "node:assert/strict";
import test from "node:test";
import { resolveImageUrl } from "./movie-image-url.ts";

test("resolveImageUrl returns primary URL when provided", () => {
  const primary = "https://phimimg.com/upload/vod/20230920-1/thumb.jpg";
  const fallback = "https://phimimg.com/upload/vod/20230920-1/poster.jpg";
  assert.equal(resolveImageUrl(primary, fallback), primary);
});

test("resolveImageUrl falls back to secondary URL when primary is absent", () => {
  const fallback = "https://phimimg.com/upload/vod/20230920-1/poster.jpg";
  assert.equal(resolveImageUrl(undefined, fallback), fallback);
  assert.equal(resolveImageUrl(null, fallback), fallback);
  assert.equal(resolveImageUrl("", fallback), fallback);
  assert.equal(resolveImageUrl("undefined", fallback), fallback);
  assert.equal(resolveImageUrl("null", fallback), fallback);
});

test("resolveImageUrl returns null when neither primary nor fallback is provided", () => {
  assert.equal(resolveImageUrl(undefined, undefined), null);
  assert.equal(resolveImageUrl(null, null), null);
  assert.equal(resolveImageUrl("", ""), null);
  assert.equal(resolveImageUrl("undefined", "null"), null);
});
