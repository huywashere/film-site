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
          type: "single",
        },
      ],
    },
    {
      source: "ophim",
      items: [
        { name: "Bố Già", slug: "bo-gia-1972", year: 1972, type: "single" },
      ],
    },
  ]);

  assert.equal(items.length, 1);
  assert.deepEqual(items[0]._sources, ["kkphim", "ophim"]);
});

test("does not collapse a movie and series with the same title and year", () => {
  const items = dedupeFilmsBySource([
    {
      source: "kkphim",
      items: [
        { name: "The Signal", slug: "the-signal-movie", year: 2024, type: "single" },
      ],
    },
    {
      source: "ophim",
      items: [
        { name: "The Signal", slug: "the-signal-series", year: 2024, type: "series" },
      ],
    },
  ]);

  assert.equal(items.length, 2);
  assert.notEqual(items[0]._canonicalKey, items[1]._canonicalKey);
});

test("keeps seasons separate while merging equivalent season labels", () => {
  const items = dedupeFilmsBySource([
    {
      source: "kkphim",
      items: [
        { name: "Silo Phần 2", slug: "silo-phan-2", year: 2024, type: "series" },
        { name: "Silo Phần 1", slug: "silo-phan-1", year: 2023, type: "series" },
      ],
    },
    {
      source: "ophim",
      items: [
        { name: "Silo Season 2", slug: "silo-season-2", year: 2024, type: "series" },
      ],
    },
  ]);

  assert.equal(items.length, 2);
  assert.equal(items.find((item) => item.year === 2024)?._duplicateCount, 2);
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

test("ranks compact and multilingual franchise aliases consistently", () => {
  const films = dedupeFilmsBySource([
    {
      source: "kkphim",
      items: [
        {
          name: "Người Nhện: Không Còn Nhà",
          origin_name: "Spider-Man: No Way Home",
          slug: "spider-man-no-way-home",
          year: 2021,
          type: "single",
        },
        {
          name: "Người Dơi",
          origin_name: "The Batman",
          slug: "the-batman",
          year: 2022,
          type: "single",
        },
      ],
    },
  ]);

  for (const query of ["spiderman", "spider man", "người nhện", "nguoinhen"]) {
    assert.equal(rankSearchResults(films, query)[0]?.slug, "spider-man-no-way-home");
  }
});

test("finds season aliases without mixing different seasons", () => {
  const films = dedupeFilmsBySource([
    {
      source: "kkphim",
      items: [
        { name: "Silo (Phần 1)", slug: "silo-phan-1", year: 2023, type: "series" },
        { name: "Silo (Phần 2)", slug: "silo-phan-2", year: 2024, type: "series" },
      ],
    },
  ]);

  assert.equal(rankSearchResults(films, "silo season 2")[0]?.slug, "silo-phan-2");
  assert.equal(rankSearchResults(films, "silo s1")[0]?.slug, "silo-phan-1");
});

test("ranks correct release year when query contains year intent", () => {
  const films = dedupeFilmsBySource([
    {
      source: "kkphim",
      items: [
        { name: "Hành Tinh Cát", origin_name: "Dune", slug: "dune-2021", year: 2021, type: "single" },
        { name: "Hành Tinh Cát: Phần Hai", origin_name: "Dune: Part Two", slug: "dune-part-two", year: 2024, type: "single" },
      ],
    },
  ]);

  const ranked2024 = rankSearchResults(films, "dune 2024");
  assert.equal(ranked2024[0]?.slug, "dune-part-two");

  const ranked2021 = rankSearchResults(films, "dune 2021");
  assert.equal(ranked2021[0]?.slug, "dune-2021");
});

test("matches movies with typos (Typo Tolerance)", () => {
  const films = dedupeFilmsBySource([
    {
      source: "kkphim",
      items: [
        { name: "Oppenheimer", origin_name: "Oppenheimer", slug: "oppenheimer", year: 2023, type: "single" },
        { name: "Hố Đen Tử Thần", origin_name: "Interstellar", slug: "interstellar", year: 2014, type: "single" },
      ],
    },
  ]);

  // "oppenhimer" missing 'e'
  const rankedOppenheimer = rankSearchResults(films, "oppenhimer");
  assert.equal(rankedOppenheimer[0]?.slug, "oppenheimer");

  // "interstelar" single 'l'
  const rankedInterstellar = rankSearchResults(films, "interstelar");
  assert.equal(rankedInterstellar[0]?.slug, "interstellar");
});

test("resolves popular movie and franchise acronyms", () => {
  const films = dedupeFilmsBySource([
    {
      source: "kkphim",
      items: [
        { name: "Trò Chơi Vương Quyền", origin_name: "Game of Thrones", slug: "game-of-thrones", year: 2011, type: "series" },
        { name: "Đại Chiến Titan", origin_name: "Attack on Titan", slug: "attack-on-titan", year: 2013, type: "hoat-hinh" },
      ],
    },
  ]);

  const rankedGot = rankSearchResults(films, "got");
  assert.equal(rankedGot[0]?.slug, "game-of-thrones");

  const rankedAot = rankSearchResults(films, "aot");
  assert.equal(rankedAot[0]?.slug, "attack-on-titan");
});

