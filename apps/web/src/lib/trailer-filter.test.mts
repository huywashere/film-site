import test from "node:test";
import assert from "node:assert/strict";
import { filterAccurateTrailers, getYoutubeTrailer, type TmdbVideo } from "./tmdb";

test("filterAccurateTrailers excludes fan-made, review, reaction, and blooper videos", () => {
  const mockVideos: TmdbVideo[] = [
    {
      id: "1",
      key: "fake_review",
      name: "Avatar 3 Official Trailer REVIEW & REACTION!",
      site: "YouTube",
      type: "Trailer",
      official: false,
      published_at: "2025-01-01T00:00:00.000Z",
      size: 1080,
    },
    {
      id: "2",
      key: "fake_fanmade",
      name: "Avengers Secret Wars (2027) - Teaser Trailer (Fan Made) | Marvel Studios Concept",
      site: "YouTube",
      type: "Trailer",
      official: false,
      published_at: "2025-01-02T00:00:00.000Z",
      size: 1080,
    },
    {
      id: "3",
      key: "fake_bts",
      name: "Behind the Scenes Featurette",
      site: "YouTube",
      type: "Behind the Scenes",
      official: true,
      published_at: "2025-01-03T00:00:00.000Z",
      size: 1080,
    },
    {
      id: "4",
      key: "fake_blooper",
      name: "Gag Reel and Bloopers",
      site: "YouTube",
      type: "Bloopers",
      official: true,
      published_at: "2025-01-04T00:00:00.000Z",
      size: 1080,
    },
    {
      id: "5",
      key: "real_official_trailer",
      name: "Avatar: Fire and Ash | Official Trailer",
      site: "YouTube",
      type: "Trailer",
      official: true,
      published_at: "2025-02-01T00:00:00.000Z",
      size: 2160,
      iso_639_1: "en",
    },
  ];

  const results = filterAccurateTrailers(mockVideos);
  assert.equal(results.length, 1);
  assert.equal(results[0].key, "real_official_trailer");
});

test("filterAccurateTrailers prioritizes official studio trailers and Vietnamese dubbed/subbed versions", () => {
  const mockVideos: TmdbVideo[] = [
    {
      id: "1",
      key: "teaser_en",
      name: "Official Teaser",
      site: "YouTube",
      type: "Teaser",
      official: true,
      published_at: "2024-06-01T00:00:00.000Z",
      size: 1080,
      iso_639_1: "en",
    },
    {
      id: "2",
      key: "trailer_en_hd",
      name: "Official Trailer",
      site: "YouTube",
      type: "Trailer",
      official: true,
      published_at: "2024-07-01T00:00:00.000Z",
      size: 1080,
      iso_639_1: "en",
    },
    {
      id: "3",
      key: "trailer_vi_4k",
      name: "Trailer Chính Thức | Lồng Tiếng",
      site: "YouTube",
      type: "Trailer",
      official: true,
      published_at: "2024-07-15T00:00:00.000Z",
      size: 2160,
      iso_639_1: "vi",
    },
  ];

  const results = filterAccurateTrailers(mockVideos);
  assert.equal(results.length, 3);
  // Vietnamese 4K official trailer ranks #1
  assert.equal(results[0].key, "trailer_vi_4k");
  // English 1080p official trailer ranks #2
  assert.equal(results[1].key, "trailer_en_hd");
  // Teaser ranks #3
  assert.equal(results[2].key, "teaser_en");
});

test("getYoutubeTrailer returns null when list is empty or only contains junk videos", () => {
  assert.equal(getYoutubeTrailer([]), null);

  const junkVideos: TmdbVideo[] = [
    {
      id: "1",
      key: "clip_interview",
      name: "Cast Interview",
      site: "YouTube",
      type: "Interview",
      official: false,
      published_at: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "2",
      key: "fan_trailer",
      name: "Dune 3 - Teaser Trailer (Fan-Made Concept)",
      site: "YouTube",
      type: "Trailer",
      official: false,
      published_at: "2025-01-01T00:00:00.000Z",
    },
  ];

  assert.equal(getYoutubeTrailer(junkVideos), null);
});
