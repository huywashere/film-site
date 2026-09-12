import assert from "node:assert/strict";
import test from "node:test";
import {
  tmdbBackdrop,
  tmdbPoster,
  isNonChineseTmdbImage,
  sortTmdbImages,
  sortTmdbLogos,
  getBestTitleLogo,
  type TmdbImage,
} from "./tmdb.ts";

test("uses the TMDB CDN directly so production avoids a serverless image hop", () => {
  const poster = tmdbPoster("/poster.jpg", "w500");
  const backdrop = tmdbBackdrop("/backdrop.jpg", "w1280");

  assert.equal(poster, "https://image.tmdb.org/t/p/w500/poster.jpg");
  assert.equal(backdrop, "https://image.tmdb.org/t/p/w1280/backdrop.jpg");
});

test("isNonChineseTmdbImage filters out any Chinese localized TMDB artwork", () => {
  assert.equal(
    isNonChineseTmdbImage({
      file_path: "/chinese.jpg",
      iso_639_1: "zh",
      vote_average: 10,
      width: 1000,
      height: 1500,
      aspect_ratio: 0.66,
    }),
    false,
  );
  assert.equal(
    isNonChineseTmdbImage({
      file_path: "/chinese-tw.jpg",
      iso_639_1: "zh-TW",
      vote_average: 10,
      width: 1000,
      height: 1500,
      aspect_ratio: 0.66,
    }),
    false,
  );
  assert.equal(
    isNonChineseTmdbImage({
      file_path: "/chinese-cn.jpg",
      iso_639_1: "cn",
      vote_average: 9,
      width: 1000,
      height: 1500,
      aspect_ratio: 0.66,
    }),
    false,
  );
  assert.equal(
    isNonChineseTmdbImage({
      file_path: "/english.jpg",
      iso_639_1: "en",
      vote_average: 8,
      width: 1000,
      height: 1500,
      aspect_ratio: 0.66,
    }),
    true,
  );
  assert.equal(
    isNonChineseTmdbImage({
      file_path: "/vietnamese.jpg",
      iso_639_1: "vi",
      vote_average: 7,
      width: 1000,
      height: 1500,
      aspect_ratio: 0.66,
    }),
    true,
  );
  assert.equal(
    isNonChineseTmdbImage({
      file_path: "/clean.jpg",
      iso_639_1: null,
      vote_average: 6,
      width: 1000,
      height: 1500,
      aspect_ratio: 0.66,
    }),
    true,
  );
});

test("sortTmdbImages excludes Chinese posters and prioritizes Vietnamese and English/clean artwork even if Chinese has higher vote_average", () => {
  const rawPosters: TmdbImage[] = [
    {
      file_path: "/chinese-reacher.jpg",
      iso_639_1: "zh",
      vote_average: 10, // Chinese poster with 10 rating (like 侠探杰克)
      width: 1000,
      height: 1500,
      aspect_ratio: 0.66,
    },
    {
      file_path: "/english-reacher.jpg",
      iso_639_1: "en",
      vote_average: 7.8,
      width: 1000,
      height: 1500,
      aspect_ratio: 0.66,
    },
    {
      file_path: "/textless-reacher.jpg",
      iso_639_1: null,
      vote_average: 7.5,
      width: 1000,
      height: 1500,
      aspect_ratio: 0.66,
    },
    {
      file_path: "/vietnamese-reacher.jpg",
      iso_639_1: "vi",
      vote_average: 7.0,
      width: 1000,
      height: 1500,
      aspect_ratio: 0.66,
    },
  ];

  const sorted = sortTmdbImages(rawPosters);

  // Chinese poster MUST be completely excluded
  assert.equal(sorted.some((p) => p.iso_639_1 === "zh"), false);

  // Vietnamese poster should be #1
  assert.equal(sorted[0].file_path, "/vietnamese-reacher.jpg");

  // English poster should be #2
  assert.equal(sorted[1].file_path, "/english-reacher.jpg");

  // Textless clean poster should be #3
  assert.equal(sorted[2].file_path, "/textless-reacher.jpg");
});

test("sortTmdbLogos excludes Chinese logos and prioritizes Vietnamese and English title logos", () => {
  const rawLogos: TmdbImage[] = [
    {
      file_path: "/chinese-logo.png",
      iso_639_1: "zh",
      vote_average: 10,
      width: 800,
      height: 300,
      aspect_ratio: 2.66,
    },
    {
      file_path: "/english-logo.png",
      iso_639_1: "en",
      vote_average: 8.5,
      width: 1200,
      height: 400,
      aspect_ratio: 3,
    },
    {
      file_path: "/vietnamese-logo.png",
      iso_639_1: "vi",
      vote_average: 7.0,
      width: 800,
      height: 300,
      aspect_ratio: 2.66,
    },
  ];

  const sorted = sortTmdbLogos(rawLogos);
  assert.equal(sorted.some((l) => l.iso_639_1 === "zh"), false);
  assert.equal(sorted[0].file_path, "/vietnamese-logo.png");
  assert.equal(sorted[1].file_path, "/english-logo.png");

  const best = getBestTitleLogo(rawLogos);
  assert.equal(best?.file_path, "/vietnamese-logo.png");
});

