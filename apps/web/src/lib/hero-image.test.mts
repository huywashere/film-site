import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHeroImageCandidates,
  HERO_LOCAL_FALLBACK,
} from "./hero-image.ts";

test("prefers a direct w1280 TMDB backdrop over the original proxy URL", () => {
  const raw = "https://image.tmdb.org/t/p/original/backdrop.jpg";
  const proxy = `/api/image-proxy?url=${encodeURIComponent(raw)}`;
  const candidates = buildHeroImageCandidates({ heroBackdrop: proxy });

  assert.equal(
    candidates[0],
    "https://image.tmdb.org/t/p/w1280/backdrop.jpg",
  );
  assert.equal(candidates.at(-1), HERO_LOCAL_FALLBACK);
});

test("prefers direct provider CDN images and always has a local fallback", () => {
  const candidates = buildHeroImageCandidates({
    thumbUrl: "https://phimimg.com/upload/movie.jpg",
  });

  assert.equal(candidates[0], "https://phimimg.com/upload/movie.jpg");
  assert.equal(candidates.at(-1), HERO_LOCAL_FALLBACK);
});

test("deduplicates equivalent hero sources", () => {
  const image = "https://image.tmdb.org/t/p/w1280/shared.jpg";
  const candidates = buildHeroImageCandidates({
    heroBackdrop: image,
    thumbUrl: image,
  });

  assert.equal(candidates.filter((candidate) => candidate === image).length, 1);
});
