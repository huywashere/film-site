import assert from "node:assert/strict";
import test from "node:test";
import {
  detectExplicitHlsAdRanges,
  filterHlsManifest,
} from "./hls-ad-filter.ts";

test("records consecutive removed ad segments at the playable timeline position", () => {
  const manifest = [
    "#EXTM3U",
    "#EXTINF:10,",
    "https://cdn.example.com/movie-1.ts",
    "#EXTINF:5,",
    "https://cdn.example.com/ads/ad-1.ts",
    "#EXTINF:6,",
    "https://cdn.example.com/ads/ad-2.ts",
    "#EXTINF:10,",
    "https://cdn.example.com/movie-2.ts",
  ].join("\n");

  const result = filterHlsManifest(
    manifest,
    "https://cdn.example.com/master.m3u8",
  );

  assert.deepEqual(result.stats.adMarkers, [{ start: 10, duration: 11 }]);
  assert.equal(result.stats.removedSegments, 2);
});

test("keeps separate ad breaks as separate timeline markers", () => {
  const manifest = [
    "#EXTM3U",
    "#EXTINF:8,",
    "movie-1.ts",
    "#EXT-X-CUE-OUT:4",
    "#EXTINF:4,",
    "commercial-1.ts",
    "#EXT-X-CUE-IN",
    "#EXTINF:12,",
    "movie-2.ts",
    "#EXTINF:5,",
    "ads/ad-2.ts",
    "#EXTINF:10,",
    "movie-3.ts",
  ].join("\n");

  const result = filterHlsManifest(
    manifest,
    "https://cdn.example.com/episode.m3u8",
  );

  assert.deepEqual(result.stats.adMarkers, [
    { start: 8, duration: 4 },
    { start: 20, duration: 5 },
  ]);
});

test("does not classify short discontinuity blocks as ads", () => {
  const result = detectExplicitHlsAdRanges([
    { cc: 0, start: 0, duration: 30, url: "movie/part-1.ts" },
    { cc: 1, start: 30, duration: 40, url: "movie/part-2.ts" },
    { cc: 2, start: 70, duration: 25, url: "movie/part-3.ts" },
  ]);

  assert.deepEqual(result, []);
});

test("marks only blocks with explicit ad URLs as skippable", () => {
  const result = detectExplicitHlsAdRanges([
    { cc: 0, start: 0, duration: 30, url: "movie/part-1.ts" },
    { cc: 1, start: 30, duration: 5, url: "ads/preroll-1.ts" },
    { cc: 1, start: 35, duration: 6, url: "ads/preroll-2.ts" },
    { cc: 2, start: 41, duration: 30, url: "movie/part-2.ts" },
  ]);

  assert.deepEqual(result, [
    { start: 30, end: 41, duration: 11, skippable: true },
  ]);
});
