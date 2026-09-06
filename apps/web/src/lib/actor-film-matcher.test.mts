import test from "node:test";
import assert from "node:assert/strict";
import { isFilmMatch } from "./actor-film-matcher.ts";

test("isFilmMatch matches when TMDB ID is identical", () => {
  const result = isFilmMatch(
    {
      tmdb: { id: "207197" },
      name: "Ninh An Như Mộng",
      origin_name: "Story of Kunning Palace",
      year: 2023,
    },
    {
      id: 207197,
      title: "Story of Kunning Palace",
      original_title: "宁安如梦",
      first_air_date: "2023-11-07",
    },
  );
  assert.equal(result, true);
});

test("isFilmMatch matches by Vietnamese name when TMDB ID is missing", () => {
  const result = isFilmMatch(
    {
      tmdb: { id: null },
      name: "Trường Nguyệt Tẫn Minh",
      origin_name: "Till The End Of The Moon",
      year: 2023,
    },
    {
      id: 137206,
      name: "Trường Nguyệt Tẫn Minh",
      original_name: "长月烬明",
      first_air_date: "2023-04-06",
    },
  );
  assert.equal(result, true);
});

test("isFilmMatch matches by English origin_name when TMDB ID is missing", () => {
  const result = isFilmMatch(
    {
      tmdb: { id: null },
      name: "Dĩ Ái Vi Doanh",
      origin_name: "Only For Love",
      year: 2023,
    },
    {
      id: 213026,
      name: "Only for Love",
      original_name: "以爱为营",
      first_air_date: "2023-11-03",
    },
  );
  assert.equal(result, true);
});

test("isFilmMatch rejects when title is completely unrelated", () => {
  const result = isFilmMatch(
    {
      tmdb: { id: "99999" },
      name: "Bố Già",
      origin_name: "The Godfather",
      year: 1972,
    },
    {
      id: 207197,
      title: "Story of Kunning Palace",
      original_title: "宁安如梦",
      first_air_date: "2023-11-07",
    },
  );
  assert.equal(result, false);
});

test("isFilmMatch rejects when title matches but release year is vastly different", () => {
  const result = isFilmMatch(
    {
      name: "Titanic",
      origin_name: "Titanic",
      year: 1953,
    },
    {
      id: 597,
      title: "Titanic",
      original_title: "Titanic",
      release_date: "1997-11-18",
    },
  );
  assert.equal(result, false);
});
