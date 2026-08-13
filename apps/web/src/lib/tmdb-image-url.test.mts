import assert from "node:assert/strict";
import test from "node:test";
import { tmdbBackdrop, tmdbPoster } from "./tmdb.ts";

test("routes TMDB artwork through the same-origin image proxy", () => {
  const poster = tmdbPoster("/poster.jpg", "w500");
  const backdrop = tmdbBackdrop("/backdrop.jpg", "w1280");

  assert.equal(
    poster,
    "/api/image-proxy?url=https%3A%2F%2Fimage.tmdb.org%2Ft%2Fp%2Fw500%2Fposter.jpg",
  );
  assert.equal(
    backdrop,
    "/api/image-proxy?url=https%3A%2F%2Fimage.tmdb.org%2Ft%2Fp%2Fw1280%2Fbackdrop.jpg",
  );
});
