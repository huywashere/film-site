import assert from "node:assert/strict";
import test from "node:test";
import { filterHlsManifest } from "./hls-ad-filter.ts";

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
