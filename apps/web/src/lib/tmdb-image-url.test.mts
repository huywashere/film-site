import assert from "node:assert/strict";
import test from "node:test";
import { tmdbBackdrop, tmdbPoster } from "./tmdb.ts";

test("uses the TMDB CDN directly so production avoids a serverless image hop", () => {
  const poster = tmdbPoster("/poster.jpg", "w500");
  const backdrop = tmdbBackdrop("/backdrop.jpg", "w1280");

  assert.equal(poster, "https://image.tmdb.org/t/p/w500/poster.jpg");
  assert.equal(backdrop, "https://image.tmdb.org/t/p/w1280/backdrop.jpg");
});
