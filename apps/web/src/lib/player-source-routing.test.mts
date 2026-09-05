import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTwoEmbedUrl,
  buildVicdnEmbedUrl,
  buildVidcoreEmbedUrl,
  buildVidlinkEmbedUrl,
  buildVidsrcEmbedUrl,
  canonicalEpisodeKey,
  canUseUnsandboxedEmbed,
  detectServerType,
  episodeNumberFromLabel,
  findMatchingEpisode,
  formatEpisodeLabel,
  getSourceAbbr,
  getSourceLabel,
  isAutomaticPlaybackSource,
  isDirectHlsAllowedByCsp,
  isTerminalHlsHttpStatus,
  resolveSeasonNumber,
  resolveServerType,
  selectInitialHlsTransport,
  sourcePriority,
} from "./player-source-routing.ts";
import { rankHealthyCandidates } from "./player-source-health.ts";

test("classifies Vietnamese server labels without leaking unknown servers", () => {
  assert.equal(detectServerType("Vietsub #1"), "vietsub");
  assert.equal(detectServerType("ViCDN Song Ngữ"), "song-ngu");
  assert.equal(detectServerType("Bilingual MultiSub"), "song-ngu");
  assert.equal(detectServerType("Song Ngữ AI"), "song-ngu");
  assert.equal(detectServerType("[KKPhim] Thuyết Minh"), "thuyet-minh");
  assert.equal(detectServerType("Thuyết Minh AI Giọng Chuẩn"), "thuyet-minh");
  assert.equal(detectServerType("Lồng Tiếng AI Studio"), "thuyet-minh");
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

test("formats provider episode slugs as a single readable label", () => {
  assert.equal(formatEpisodeLabel("tap-01"), "Tập 1");
  assert.equal(formatEpisodeLabel("Tập tap-01"), "Tập 1");
  assert.equal(formatEpisodeLabel("episode-002"), "Tập 2");
  assert.equal(formatEpisodeLabel("full"), "Tập Full");
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

  const singleMovieEp = findMatchingEpisode(
    [{ name: "Tập Full", slug: "tap-full", link_embed: "https://vicdn.cc/mv-121491-1-1" }],
    "1",
  );
  assert.equal(singleMovieEp?.slug, "tap-full");
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
  const direct = "https://cdn.phimapi.com/movie/master.m3u8";
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
    selectInitialHlsTransport("https://unlisted-stream.example/movie/master.m3u8", proxy, false),
    {
      primary: proxy,
      fallback: undefined,
    },
  );
  assert.deepEqual(selectInitialHlsTransport(direct, "https://evil.test/proxy", true), {
    primary: direct,
    fallback: undefined,
  });
});

test("does not relay manifests that the provider has removed", () => {
  assert.equal(isTerminalHlsHttpStatus(404), true);
  assert.equal(isTerminalHlsHttpStatus("410"), true);
  assert.equal(isTerminalHlsHttpStatus(403), false);
  assert.equal(isTerminalHlsHttpStatus(undefined), false);
});

test("only removes iframe sandbox for known VidSrc, ViCDN, NguonC, VSMov, and KKPhim HTTPS hosts", () => {
  assert.equal(canUseUnsandboxedEmbed("vidsrc", "https://vidsrc.sbs/embed/movie/533535"), true);
  assert.equal(canUseUnsandboxedEmbed("vidsrc", "https://vidsrc.to/embed/movie/123"), false);
  assert.equal(canUseUnsandboxedEmbed("kkphim", "https://vidsrc.to/embed/movie/123"), false);
  assert.equal(canUseUnsandboxedEmbed("vidsrc", "https://vidsrc.to.evil.test/embed/123"), false);
  assert.equal(canUseUnsandboxedEmbed("vidsrc", "javascript:alert(1)"), false);
  assert.equal(canUseUnsandboxedEmbed("nguonc", "https://embed.streamc.xyz/embed.php?hash=123"), true);
  assert.equal(canUseUnsandboxedEmbed("nguonc", "https://embed13.streamc.xyz/embed.php?hash=123"), true);
  assert.equal(canUseUnsandboxedEmbed("nguonc", "https://streamc.xyz/player"), true);
  assert.equal(canUseUnsandboxedEmbed("nguonc", "https://evil.streamc.xyz.fake/embed"), false);
  assert.equal(canUseUnsandboxedEmbed("vsmov", "https://v6.streamvsmov.com/video/525afddb"), true);
  assert.equal(canUseUnsandboxedEmbed("vsmov", "https://streamvsmov.com/player"), true);
  assert.equal(canUseUnsandboxedEmbed("kkphim", "https://player.phimapi.com/player/?url=test"), true);
  assert.equal(canUseUnsandboxedEmbed("kkphim", "https://v7.kkphimplayer7.com/player/?url=test"), true);
  assert.equal(canUseUnsandboxedEmbed("kkphim", "https://phim1280.tv/player/?url=test"), true);
  assert.equal(canUseUnsandboxedEmbed("ophim", "https://opstream14.com/player/test"), true);
});

test("allows direct HLS playback for known CDN domains", () => {
  assert.equal(isDirectHlsAllowedByCsp("https://v7.kkphimplayer7.com/20260822/index.m3u8"), true);
  assert.equal(isDirectHlsAllowedByCsp("https://s6.kkphimplayer6.com/20260822/index.m3u8"), true);
  assert.equal(isDirectHlsAllowedByCsp("https://s5.phim1280.tv/20260822/index.m3u8"), true);
  assert.equal(isDirectHlsAllowedByCsp("https://opstream14.com/20260822/index.m3u8"), true);
  assert.equal(isDirectHlsAllowedByCsp("https://evil-untrusted-cdn.com/test.m3u8"), false);
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
  assert.equal(buildVidsrcEmbedUrl({ tmdbId: 1399, mediaType: "tv", season: 1 }), null);
});

test("derives VidSrc season and episode numbers from Vietnamese labels", () => {
  assert.equal(resolveSeasonNumber(undefined, "Phần 03", "show-slug"), 3);
  assert.equal(resolveSeasonNumber(undefined, "Season 2"), 2);
  assert.equal(resolveSeasonNumber("0", "Season 4"), 4);
  assert.equal(resolveSeasonNumber(undefined, "Không ghi mùa"), 1);
  assert.equal(episodeNumberFromLabel("Tập 007"), 7);
  assert.equal(episodeNumberFromLabel("Full Movie"), null);
});

test("builds documented vicdn.cc movie and TV embed URLs", () => {
  assert.equal(
    buildVicdnEmbedUrl({ tmdbId: 287496, mediaType: "movie" }),
    "https://vicdn.cc/mv-287496-1-1",
  );
  assert.equal(
    buildVicdnEmbedUrl({
      tmdbId: "287496",
      mediaType: "tv",
      season: 1,
      episode: 5,
    }),
    "https://vicdn.cc/tv-287496-1-5",
  );
  assert.equal(
    buildVicdnEmbedUrl({
      tmdbId: "not-a-tmdb-id",
      mediaType: "movie",
    }),
    null,
  );
});

test("formats provider abbreviations correctly", () => {
  assert.equal(getSourceAbbr("kkphim"), "KP");
  assert.equal(getSourceAbbr("nguonc"), "NC");
  assert.equal(getSourceAbbr("vsmov"), "VS");
  assert.equal(getSourceAbbr("ophim"), "OP");
  assert.equal(getSourceAbbr("vicdn"), "ViCDN");
  assert.equal(getSourceAbbr("vidsrc"), "VidSrc");
  assert.equal(getSourceAbbr("vidlink"), "VidLink");
  assert.equal(getSourceAbbr("2embed"), "2Embed");
  assert.equal(getSourceAbbr("vidcore"), "VidCore");
  assert.equal(getSourceAbbr(undefined), "KP");
});

test("keeps ViCDN, VidSrc, VidLink, 2Embed, VidCore in dedicated language groups and defaults VN providers to vietsub", () => {
  assert.equal(resolveServerType("vicdn", "Server 1"), "song-ngu");
  assert.equal(resolveServerType("vidsrc", "Server 1"), "engsub");
  assert.equal(resolveServerType("vidlink", "Server 2"), "engsub");
  assert.equal(resolveServerType("2embed", "Server 3"), "engsub");
  assert.equal(resolveServerType("vidcore", "Server 4"), "engsub");
  assert.equal(resolveServerType("kkphim", "Vietsub"), "vietsub");
  assert.equal(resolveServerType("kkphim", "Server #1"), "vietsub");
  assert.equal(resolveServerType("nguonc", "Server #1"), "vietsub");
  assert.equal(resolveServerType("vsmov", "VIP 1"), "vietsub");
  assert.equal(resolveServerType("nguonc", "Thuyết Minh"), "thuyet-minh");
  assert.equal(getSourceLabel("kkphim"), "KKPhim");
  assert.equal(getSourceLabel("vidsrc"), "VidSrc");
  assert.equal(getSourceLabel("vidlink"), "VidLink");
  assert.equal(getSourceLabel("2embed"), "2Embed");
  assert.equal(getSourceLabel("vidcore"), "VidCore");
});

test("builds documented vidlink.pro movie and TV embed URLs", () => {
  assert.equal(
    buildVidlinkEmbedUrl({ tmdbId: 786892, mediaType: "movie" }),
    "https://vidlink.pro/movie/786892?primaryColor=23ade5",
  );
  assert.equal(
    buildVidlinkEmbedUrl({
      tmdbId: "94997",
      mediaType: "tv",
      season: 1,
      episode: 1,
      autoplay: true,
      primaryColor: "23ade5",
    }),
    "https://vidlink.pro/tv/94997/1/1?autoplay=true&primaryColor=23ade5",
  );
  assert.equal(
    buildVidlinkEmbedUrl({
      tmdbId: "invalid",
      mediaType: "movie",
    }),
    null,
  );
  assert.equal(
    canUseUnsandboxedEmbed("vidlink", "https://vidlink.pro/movie/786892"),
    true,
  );
});

test("builds documented 2embed.cc movie and TV embed URLs", () => {
  assert.equal(
    buildTwoEmbedUrl({ tmdbId: 609681, mediaType: "movie" }),
    "https://www.2embed.cc/embed/609681",
  );
  assert.equal(
    buildTwoEmbedUrl({
      tmdbId: "60735",
      mediaType: "tv",
      season: 1,
      episode: 1,
    }),
    "https://www.2embed.cc/embedtv/60735&s=1&e=1",
  );
  assert.equal(
    buildTwoEmbedUrl({
      tmdbId: "not-a-number",
      mediaType: "movie",
    }),
    null,
  );
  assert.equal(
    canUseUnsandboxedEmbed("2embed", "https://www.2embed.cc/embed/609681"),
    true,
  );
  assert.equal(
    canUseUnsandboxedEmbed("2embed", "https://www.2embed.skin/embed/609681"),
    true,
  );
});

test("builds documented vidcore.org movie and TV embed URLs", () => {
  assert.equal(
    buildVidcoreEmbedUrl({ tmdbId: 533535, mediaType: "movie" }),
    "https://vidcore.org/embed/movie/533535?theme=23ade5",
  );
  assert.equal(
    buildVidcoreEmbedUrl({
      tmdbId: "94997",
      mediaType: "tv",
      season: 2,
      episode: 5,
      autoplay: true,
      theme: "ff0000",
    }),
    "https://vidcore.org/embed/tv/94997/2/5?autoplay=true&theme=ff0000",
  );
  assert.equal(
    buildVidcoreEmbedUrl({
      tmdbId: "abc",
      mediaType: "movie",
    }),
    null,
  );
  assert.equal(
    canUseUnsandboxedEmbed("vidcore", "https://vidcore.org/embed/movie/533535"),
    true,
  );
});
