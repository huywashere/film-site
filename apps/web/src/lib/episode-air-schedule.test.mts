import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCurrentEpisodeNumber,
  isCompletedFilm,
  calculateNextAirInfo,
} from "./episode-air-schedule.ts";

test("parseCurrentEpisodeNumber extracts episode digits correctly", () => {
  assert.equal(parseCurrentEpisodeNumber("Tập 7"), 7);
  assert.equal(parseCurrentEpisodeNumber("Tập 7/12"), 7);
  assert.equal(parseCurrentEpisodeNumber("Ep 12"), 12);
  assert.equal(parseCurrentEpisodeNumber("18"), 18);
  assert.equal(parseCurrentEpisodeNumber("Full"), null);
  assert.equal(parseCurrentEpisodeNumber(undefined), null);
});

test("isCompletedFilm detects completed films", () => {
  assert.equal(isCompletedFilm("completed"), true);
  assert.equal(isCompletedFilm("ongoing", "Hoàn tất (12/12)"), true);
  assert.equal(isCompletedFilm("ongoing", "Full"), true);
  assert.equal(isCompletedFilm("ongoing", "Trọn bộ 24 tập"), true);
  assert.equal(isCompletedFilm("ongoing", "Tập 7"), false);
  assert.equal(isCompletedFilm(undefined, "Tập 18/24"), false);
});

test("calculateNextAirInfo returns next episode and air date for ongoing series", () => {
  const baseDate = new Date("2026-09-04T00:00:00Z"); // Thứ Sáu
  const info = calculateNextAirInfo(
    {
      name: "Đảo Hải Tặc",
      slug: "one-piece",
      type: "series",
      status: "ongoing",
      episode_current: "Tập 7",
    },
    [],
    baseDate,
  );

  assert.ok(info);
  assert.equal(info.nextEpisode, 8);
  assert.equal(info.episodeLabel, "Tập 8");
  // One piece targetDay = 0 (Sunday). Từ Thứ Sáu (4) đến Chủ Nhật (0) là 2 ngày -> 2026-09-06
  assert.equal(info.airDateStr, "06-09-2026");
  assert.ok(info.message.includes("Tập 8"));
  assert.ok(info.message.includes("06-09-2026"));
  assert.ok(info.message.includes("😚"));
});

test("calculateNextAirInfo uses TMDB next_episode_to_air when provided in future", () => {
  const baseDate = new Date("2026-09-01T00:00:00Z");
  const info = calculateNextAirInfo(
    {
      name: "Loki (Phần 2)",
      slug: "loki-2",
      type: "series",
      episode_current: "Tập 5",
      tmdb: {
        next_episode_to_air: {
          air_date: "2026-09-11",
          episode_number: 6,
        },
      },
    },
    [],
    baseDate,
  );

  assert.ok(info);
  assert.equal(info.airDateStr, "11-09-2026");
  assert.ok(info.message.includes("ngày 11-09-2026"));
});

test("calculateNextAirInfo handles upcoming movie / trailer", () => {
  const baseDate = new Date("2026-09-01T00:00:00Z");
  const info = calculateNextAirInfo(
    {
      name: "Deadpool & Wolverine",
      slug: "deadpool-and-wolverine",
      type: "single",
      status: "trailer",
      episode_current: "Trailer",
    },
    [],
    baseDate,
  );

  assert.ok(info);
  assert.equal(info.type, "single");
  assert.equal(info.episodeLabel, "Bản Full HD");
  assert.ok(info.message.includes("Bản Full HD sẽ phát sóng"));
});

test("calculateNextAirInfo returns null when series reached total episodes", () => {
  const info = calculateNextAirInfo({
    name: "Cửa Hàng Sát Thủ",
    slug: "a-shop-for-killers",
    type: "series",
    episode_current: "Tập 8",
    episode_total: "8 Tập",
  });

  assert.equal(info, null);
});

test("calculateNextAirInfo returns null for completed series", () => {
  const info = calculateNextAirInfo({
    name: "Biệt Đội Siêu Anh Hùng 4",
    slug: "avengers-endgame",
    type: "single",
    status: "completed",
    episode_current: "Full",
  });

  assert.equal(info, null);
});
