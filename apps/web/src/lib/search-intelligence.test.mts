import assert from "node:assert/strict";
import test from "node:test";

import {
  dedupeFilmsBySource,
  type NormalizedFilmItem,
} from "./movie-normalizer";
import { filterSearchResults } from "./search-filters";
import { rankSearchResults } from "./search-engine";

test("merges translated provider copies using all title aliases", () => {
  const items = dedupeFilmsBySource([
    {
      source: "kkphim",
      items: [
        {
          name: "Bố Già",
          origin_name: "The Godfather",
          slug: "the-godfather",
          year: 1972,
        },
      ],
    },
    {
      source: "ophim",
      items: [{ name: "Bố Già", slug: "bo-gia-1972", year: 1972 }],
    },
  ]);

  assert.equal(items.length, 1);
  assert.deepEqual(items[0]._sources, ["kkphim", "ophim"]);
});

test("applies type, genre, country and year together", () => {
  const films = [
    {
      name: "Bố Già",
      slug: "the-godfather",
      year: 1972,
      type: "single",
      category: [{ slug: "chien-tranh" }],
      country: [{ slug: "anh" }],
      _source: "kkphim",
      _sources: ["kkphim"],
      _sourceSlugs: { kkphim: "the-godfather" },
      _canonicalKey: "film:the-godfather:1972",
      _duplicateCount: 1,
      _rank: 0,
    },
    {
      name: "Bố Già",
      slug: "bo-gia-viet-nam",
      year: 2021,
      type: "single",
      category: [{ slug: "gia-dinh" }],
      country: [{ slug: "viet-nam" }],
      _source: "kkphim",
      _sources: ["kkphim"],
      _sourceSlugs: { kkphim: "bo-gia-viet-nam" },
      _canonicalKey: "film:bo-gia:2021",
      _duplicateCount: 1,
      _rank: 1,
    },
  ] as NormalizedFilmItem[];

  const filtered = filterSearchResults(films, {
    type: "single",
    genre: "chien-tranh",
    country: "anh",
    year: 1972,
  });
  assert.deepEqual(
    filtered.map((film) => film.slug),
    ["the-godfather"],
  );
});

test("removes provider filler when genuine query matches exist", () => {
  const films = dedupeFilmsBySource([
    {
      source: "kkphim",
      items: [
        {
          name: "Bố Già",
          origin_name: "The Godfather",
          slug: "bo-gia",
          year: 1972,
        },
        { name: "Bộ Giáp Rỉ Sét", slug: "bo-giap-ri-set", year: 2024 },
        { name: "Phim Hoàn Toàn Khác", slug: "phim-khac", year: 2025 },
      ],
    },
  ]);

  const ranked = rankSearchResults(films, "bố già");
  assert.equal(ranked[0].slug, "bo-gia");
  assert.ok(!ranked.some((film) => film.slug === "phim-khac"));
});
