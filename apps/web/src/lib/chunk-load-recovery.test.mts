import assert from "node:assert/strict";
import test from "node:test";

import {
  buildChunkRecoveryUrl,
  isChunkLoadError,
} from "./chunk-load-recovery";

test("recognizes stale Next dynamic chunks", () => {
  assert.equal(
    isChunkLoadError(
      new Error("Failed to load chunk /_next/static/chunks/swiper.js"),
    ),
    true,
  );
  assert.equal(isChunkLoadError({ name: "ChunkLoadError" }), true);
  assert.equal(isChunkLoadError(new Error("API request failed")), false);
});

test("adds a cache buster without discarding the current route", () => {
  const recovered = new URL(
    buildChunkRecoveryUrl("https://netphim.test/?page=2#top", 1234),
  );

  assert.equal(recovered.pathname, "/");
  assert.equal(recovered.searchParams.get("page"), "2");
  assert.equal(recovered.searchParams.get("__netphim_chunk_reload"), "1234");
  assert.equal(recovered.hash, "#top");
});
