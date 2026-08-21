import assert from "node:assert/strict";
import test from "node:test";
import {
  buildVidsrcEmbedUrl,
  canonicalEpisodeKey,
  canUseUnsandboxedEmbed,
  detectServerType,
  episodeNumberFromLabel,
  findMatchingEpisode,
  isAutomaticPlaybackSource,
  resolveSeasonNumber,
  selectInitialHlsTransport,
  sourcePriority,
} from "./player-source-routing.ts";
import { rankHealthyCandidates } from "./player-source-health.ts";

test("classifies Vietnamese server labels without leaking unknown servers", () => {
  assert.equal(detectServerType("Vietsub #1"), "vietsub");
  assert.equal(detectServerType("[KKPhim] Thuyết Minh"), "thuyet-minh");
  assert.equal(detectServerType("[NguonC] Lồng Tiếng #1"), "thuyet-minh");
  assert.equal(detectServerType("VidSrc Engsub"), "engsub");
  assert.equal(detectServerType("Server #1"), "raw");
});

test("normalizes equivalent episode labels across providers", () => {
  assert.equal(canonicalEpisodeKey("tap-01"), "1");
  assert.equal(canonicalEpisodeKey("Tập 1"), "1");
  assert.equal(canonicalEpisodeKey("episode-001"), "1");
  assert.equal(canonicalEpisodeKey("Full Movie"), "full");
});

test("finds the same episode even when provider slugs differ", () => {
  const episode = findMatchingEpisode(
    [
      { name: "Tập 1", slug: "tap-1", link_embed: "https://one.test" },
      { name: "Tập 2", slug: "tap-2", link_embed: "https://two.test" },
    ],
    "episode-02",
  );
  assert.equal(episode?.slug, "tap-2");
});

test("uses provider and transport priority when health is equal", () => {
  const ranked = rankHealthyCandidates([
    { key: "ophim:1", priority: 25 },
    { key: "kkphim:1", priority: 52 },
    { key: "nguonc:1", priority: 41 },
  ]);
  assert.deepEqual(
    ranked.map((candidate) => candidate.key),
    ["kkphim:1", "nguonc:1", "ophim:1"],
  );
});

test("prefers observable HLS transport over a higher-ranked iframe provider", () => {
  const kkphimIframe = sourcePriority(
    "kkphim",
    [{ slug: "tap-1", link_embed: "https://embed.test" }],
    "episode-1",
  );
  const vsmovHls = sourcePriority(
    "vsmov",
    [{ slug: "1", link_m3u8: "https://stream.test/master.m3u8" }],
    "tap-01",
  );
  assert.ok(vsmovHls > kkphimIframe);
});

test("prefers same-origin HLS on mobile and preserves direct fallback", () => {
  const direct = "https://stream.example/movie/master.m3u8";
  const proxy = "/api/hls-proxy?url=signed";

  assert.deepEqual(selectInitialHlsTransport(direct, proxy, true), {
    primary: proxy,
    fallback: direct,
  });
  assert.deepEqual(selectInitialHlsTransport(direct, proxy, false), {
    primary: direct,
    fallback: proxy,
  });
  assert.deepEqual(
    selectInitialHlsTransport(direct, "https://evil.test/proxy", true),
    { primary: direct, fallback: undefined },
  );
});

test("only removes iframe sandbox for known VidSrc HTTPS hosts", () => {
  assert.equal(
    canUseUnsandboxedEmbed("vidsrc", "https://vidsrc.sbs/embed/movie/533535"),
    true,
  );
  assert.equal(
    canUseUnsandboxedEmbed("vidsrc", "https://vidsrc.to/embed/movie/123"),
    false,
  );
  assert.equal(
    canUseUnsandboxedEmbed("kkphim", "https://vidsrc.to/embed/movie/123"),
    false,
  );
  assert.equal(
    canUseUnsandboxedEmbed("vidsrc", "https://vidsrc.to.evil.test/embed/123"),
    false,
  );
  assert.equal(canUseUnsandboxedEmbed("vidsrc", "javascript:alert(1)"), false);
});

test("keeps VidSrc manual-only and Vietnamese providers automatic", () => {
  assert.equal(isAutomaticPlaybackSource("vidsrc"), false);
  assert.equal(isAutomaticPlaybackSource("kkphim"), true);
  assert.equal(isAutomaticPlaybackSource("ophim"), true);
  assert.equal(isAutomaticPlaybackSource("nguonc"), true);
  assert.equal(isAutomaticPlaybackSource("vsmov"), true);
});

test("builds documented vidsrc.sbs movie and TV embed URLs", () => {
  assert.equal(
    buildVidsrcEmbedUrl({ tmdbId: 533535, mediaType: "movie" }),
    "https://vidsrc.sbs/embed/movie/533535?sub=en",
  );
  assert.equal(
    buildVidsrcEmbedUrl({
      tmdbId: "1399",
      mediaType: "tv",
      season: 2,
      episode: 3,
      autoplay: true,
      subtitle: "en",
      color: "8B5CF6",
    }),
    "https://vidsrc.sbs/embed/tv/1399/2/3?autoplay=1&sub=en&color=8b5cf6",
  );
  assert.equal(
    buildVidsrcEmbedUrl({
      tmdbId: "not-a-tmdb-id",
      mediaType: "movie",
    }),
    null,
  );
  assert.equal(
    buildVidsrcEmbedUrl({ tmdbId: 1399, mediaType: "tv", season: 1 }),
    null,
  );
});

test("derives VidSrc season and episode numbers from Vietnamese labels", () => {
  assert.equal(resolveSeasonNumber(undefined, "Phần 03", "show-slug"), 3);
  assert.equal(resolveSeasonNumber(undefined, "Season 2"), 2);
  assert.equal(resolveSeasonNumber("0", "Season 4"), 4);
  assert.equal(resolveSeasonNumber(undefined, "Không ghi mùa"), 1);
  assert.equal(episodeNumberFromLabel("Tập 007"), 7);
  assert.equal(episodeNumberFromLabel("Full Movie"), null);
});
