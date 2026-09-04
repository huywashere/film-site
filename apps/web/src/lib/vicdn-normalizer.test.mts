import assert from "node:assert/strict";
import test from "node:test";
import { normalizeVicdnPayload } from "./vicdn-normalizer.ts";

test("normalizes ViCDN update list response with pagination", () => {
  const raw = {
    status: "success",
    pagination: {
      total_records: 589,
      total_pages: 59,
      current_page: 1,
      per_page: 10,
    },
    data: [
      {
        slug: "tv-287496-1",
        stt: "36",
        total: "36",
        ename: "The Road To Splendor",
        vname: "Hoa Khai Cẩm Tú",
        poster: "https://image.tmdb.org/t/p/w400/poster.jpg",
        banner: "https://image.tmdb.org/t/p/w1280/banner.jpg",
        year: 2026,
        duration: 45,
        country: ["CN"],
        cast: ["Đinh Vũ Hề", "Đặng Ân Hy", "12345"],
        genre: ["Chính Kịch", "Cổ Trang"],
        content: "Nội dung phim...",
        type: "tv",
        tmdb: "287496",
        ss: "1",
      },
    ],
  };

  const res = normalizeVicdnPayload(raw) as any;
  assert.equal(res.status, true);
  assert.equal(res.items.length, 1);

  const item = res.items[0];
  assert.equal(item.name, "Hoa Khai Cẩm Tú");
  assert.equal(item.origin_name, "The Road To Splendor");
  assert.equal(item.episode_current, "Full");
  assert.equal(item.quality, "FHD");
  assert.equal(item.lang, "Song Ngữ");
  assert.equal(item._source, "vicdn");
  assert.equal(item.category[0].name, "Chính Kịch");
  assert.equal(item.country[0].name, "Trung Quốc");
  assert.deepEqual(item.actor, ["Đinh Vũ Hề", "Đặng Ân Hy"]); // filtered numeric IDs
});

test("normalizes ViCDN film detail response with episode embed list", () => {
  const raw = {
    status: "success",
    data: {
      slug: "tv-287496-1",
      stt: "2",
      total: "36",
      ename: "The Road To Splendor",
      vname: "Hoa Khai Cẩm Tú",
      poster: "https://image.tmdb.org/t/p/w400/poster.jpg",
      banner: "https://image.tmdb.org/t/p/w1280/banner.jpg",
      year: 2026,
      duration: 45,
      country: ["CN"],
      cast: ["Đinh Vũ Hề"],
      genre: ["Chính Kịch"],
      content: "Nội dung...",
      type: "tv",
      tmdb: "287496",
      ss: "1",
      list_episodes: [
        "1|https://vicdn.cc/tv-287496-1-1",
        "2|https://vicdn.cc/tv-287496-1-2",
      ],
    },
  };

  const res = normalizeVicdnPayload(raw) as any;
  assert.equal(res.status, true);
  assert.equal(res.movie.name, "Hoa Khai Cẩm Tú");
  assert.equal(res.movie.episode_current, "Tập 2/36");
  assert.equal(res.episodes.length, 1);
  assert.equal(res.episodes[0].server_name, "ViCDN Song Ngữ");
  assert.equal(res.episodes[0]._type, "song-ngu");
  assert.equal(res.episodes[0].server_data.length, 2);
  assert.equal(res.episodes[0].server_data[0].slug, "tap-1");
  assert.equal(
    res.episodes[0].server_data[0].link_embed,
    "https://vicdn.cc/tv-287496-1-1",
  );
});

test("normalizes ViCDN single movie detail with 'Full' episode label", () => {
  const raw = {
    status: "success",
    data: {
      slug: "mv-121491-1",
      stt: "1",
      total: "1",
      ename: "Deranged",
      vname: "Ký Sinh Trùng",
      poster: "https://image.tmdb.org/t/p/w400/poster.jpg",
      banner: "https://image.tmdb.org/t/p/w1280/banner.jpg",
      year: 2012,
      duration: 109,
      country: ["KR"],
      cast: ["Myeong Min Kim"],
      genre: ["Chính Kịch"],
      content: "Nội dung phim Ký Sinh Trùng...",
      type: "movie",
      tmdb: "121491",
      ss: "1",
      list_episodes: ["Full|https://vicdn.cc/mv-121491-1-1"],
    },
  };

  const res = normalizeVicdnPayload(raw) as any;
  assert.equal(res.status, true);
  assert.equal(res.movie.name, "Ký Sinh Trùng");
  assert.equal(res.episodes.length, 1);
  assert.equal(res.episodes[0].server_name, "ViCDN Song Ngữ");
  assert.equal(res.episodes[0].server_data.length, 1);
  assert.equal(res.episodes[0].server_data[0].name, "Tập Full");
  assert.equal(res.episodes[0].server_data[0].slug, "tap-full");
  assert.equal(
    res.episodes[0].server_data[0].link_embed,
    "https://vicdn.cc/mv-121491-1-1",
  );
});

test("handles ViCDN movie not found error payload cleanly", () => {
  const raw = {
    status: "error",
    message: "Movie not found",
  };

  const res = normalizeVicdnPayload(raw) as any;
  assert.equal(res.status, false);
  assert.equal(res.error, true);
  assert.equal(res.movie, null);
  assert.deepEqual(res.episodes, []);
});
