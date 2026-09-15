import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { catalogQualityScore, curateCatalogFilms } from "./catalog-curation.ts";

function film(
  slug: string,
  genre: string,
  rating: number,
  votes: number,
  country = "au-my",
) {
  return {
    slug,
    name: slug,
    year: 2025,
    poster_url: `https://example.com/${slug}.jpg`,
    category: [{ slug: genre }],
    country: [{ slug: country }],
    tmdb: { vote_average: rating, vote_count: votes },
  };
}

test("a well-established title outranks a one-vote score", () => {
  const established = film("established", "chinh-kich", 7.8, 530);
  const suspicious = film("suspicious", "chinh-kich", 9.5, 1);
  assert.ok(
    catalogQualityScore(established, "series") >
      catalogQualityScore(suspicious, "series"),
  );
});

test("single catalogue does not begin with only horror and animation", () => {
  const input = [
    ...Array.from({ length: 12 }, (_, index) =>
      film(`horror-${index}`, "kinh-di", 8.4, 1000 - index),
    ),
    ...Array.from({ length: 8 }, (_, index) =>
      film(`anime-${index}`, "hoat-hinh", 8.3, 900 - index, "nhat-ban"),
    ),
    ...Array.from({ length: 12 }, (_, index) =>
      film(
        `drama-${index}`,
        "chinh-kich",
        7.8,
        500 - index,
        index % 2 ? "han-quoc" : "au-my",
      ),
    ),
  ];

  const curated = curateCatalogFilms(input, "single").slice(0, 16);
  const horrorCount = curated.filter((item) =>
    item.category.some((category) => category.slug === "kinh-di"),
  ).length;
  const animationCount = curated.filter((item) =>
    item.category.some((category) => category.slug === "hoat-hinh"),
  ).length;

  assert.ok(horrorCount <= 4);
  assert.ok(animationCount <= 3);
  assert.ok(curated.some((item) => item.slug.startsWith("drama-")));
  assert.equal(curateCatalogFilms(input, "single").length, input.length);
});

test("different seasons of one franchise do not fill the first positions", () => {
  const input = [
    film("galaxy-season-2", "vien-tuong", 8.7, 1700),
    film("galaxy-season-1", "vien-tuong", 8.7, 1690),
    film("crime-story", "hinh-su", 8.2, 800, "han-quoc"),
    film("family-story", "gia-dinh", 8.1, 700, "trung-quoc"),
  ];
  input[0].origin_name = "Galaxy Season 2";
  input[1].origin_name = "Galaxy Season 1";

  const curated = curateCatalogFilms(input, "series");
  assert.notEqual(
    curated[0].slug.startsWith("galaxy"),
    curated[1].slug.startsWith("galaxy"),
  );
  assert.equal(curated.length, input.length);
});

test("browse quick filters do not duplicate Marvel and DC universe entries", () => {
  const source = readFileSync("src/app/films/page.tsx", "utf8");
  const quickTypes = source.match(/const QUICK_TYPES = \[[\s\S]*?\n\];/)?.[0];

  assert.ok(quickTypes);
  assert.doesNotMatch(quickTypes, /Marvel Studios|DC Universe/);
});
