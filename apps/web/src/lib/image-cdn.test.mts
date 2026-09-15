import assert from "node:assert/strict";
import test from "node:test";
import {
  buildArtworkCandidates,
  isPreOptimizedImageUrl,
  localImageProxyUrl,
  tmdbImageVariant,
  unwrapImageUrl,
  wsrvImageUrl,
  wsrvPublicImageUrl,
} from "./image-cdn.ts";

const provider = "https://phimimg.com/uploads/movies/example.webp";

test("builds deterministic wsrv presets", () => {
  const result = wsrvImageUrl("https://image.tmdb.org/t/p/w500/poster.jpg", "poster");
  assert.ok(result);
  const parsed = new URL(result);
  assert.equal(parsed.hostname, "wsrv.nl");
  assert.equal(
    parsed.searchParams.get("url"),
    "https://image.tmdb.org/t/p/w500/poster.jpg",
  );
  assert.equal(parsed.searchParams.get("w"), "400");
  assert.equal(parsed.searchParams.get("h"), "600");
  assert.equal(parsed.searchParams.get("output"), "webp");
  assert.equal(parsed.searchParams.get("we"), "1");
});

test("unwraps wsrv and local proxy URLs to prevent double proxying", () => {
  const wsrv = wsrvImageUrl(provider, "card")!;
  const local = localImageProxyUrl(wsrv)!;
  assert.equal(unwrapImageUrl(wsrv), provider);
  assert.equal(unwrapImageUrl(local), provider);
  assert.equal(
    new URL(wsrvImageUrl(local, "card")!).searchParams.get("url"),
    provider,
  );
  assert.equal(isPreOptimizedImageUrl(local), true);
});

test("adds an independent provider fallback to one same-origin relay", () => {
  const primary = "https://phimimg.com/primary.webp";
  const fallback = "https://phim.nguonc.com/fallback.jpg";
  const local = localImageProxyUrl(primary, { fallback })!;
  const parsed = new URL(local, "https://netphim.local");
  assert.equal(parsed.searchParams.get("url"), primary);
  assert.equal(parsed.searchParams.get("fallback"), fallback);
});

test("keeps TMDB direct and skips the wsrv hop", () => {
  const tmdb = "https://image.tmdb.org/t/p/w500/poster.jpg";
  const candidates = buildArtworkCandidates([tmdb], "poster");
  assert.equal(candidates[0], tmdb);
  assert.equal(
    candidates.some((value) => value.startsWith("https://wsrv.nl")),
    false,
  );
  assert.equal(isPreOptimizedImageUrl(tmdb), true);
});

test("upgrades an undersized TMDB URL for full-width showcases", () => {
  assert.equal(
    tmdbImageVariant(
      "https://image.tmdb.org/t/p/w500/backdrop.jpg",
      "original",
    ),
    "https://image.tmdb.org/t/p/original/backdrop.jpg",
  );
  assert.equal(tmdbImageVariant(provider, "original"), null);
});

test("serves NguonC artwork directly instead of double optimizing it", () => {
  assert.equal(
    isPreOptimizedImageUrl(
      "https://phim.nguonc.com/public/images/Film/example.jpg",
    ),
    true,
  );
});

test("deduplicates proxied and direct copies of the same source", () => {
  const candidates = buildArtworkCandidates(
    [provider, wsrvImageUrl(provider, "poster"), localImageProxyUrl(provider)],
    "poster",
  );
  assert.equal(candidates.filter((value) => value === provider).length, 1);
  assert.equal(candidates.length, 2);
  assert.equal(
    candidates.some((value) => value.startsWith("https://wsrv.nl")),
    false,
  );
});

test("preferEdge prioritizes edge wsrv for fast delivery in restricted network regions", () => {
  const tmdb = "https://image.tmdb.org/t/p/w500/poster.jpg";
  const candidates = buildArtworkCandidates([tmdb], "poster", {
    preferEdge: true,
  });
  assert.equal(candidates[0].startsWith("https://wsrv.nl"), true);
  assert.equal(candidates.includes(tmdb), true);
});

test("uses a compact wsrv WebP first for transparent TMDB title logos", () => {
  const tmdb = "https://image.tmdb.org/t/p/w500/title-logo.png";
  const candidates = buildArtworkCandidates([tmdb], "titleLogo", {
    preferEdge: true,
    strictProxy: true,
  });

  const primary = new URL(candidates[0]);
  assert.equal(primary.hostname, "wsrv.nl");
  assert.equal(primary.searchParams.get("w"), "640");
  assert.equal(primary.searchParams.get("h"), "260");
  assert.equal(primary.searchParams.get("fit"), "contain");
  assert.equal(primary.searchParams.get("output"), "webp");
  assert.equal(candidates[1], tmdb);
  assert.match(candidates[2], /^\/api\/image-proxy\?/);
});

test("builds responsive wsrv URLs for first-party public artwork", () => {
  const result = wsrvPublicImageUrl(
    "/images/auth/login/login-1.webp",
    "backdrop",
    { width: 640, height: null, quality: 75 },
  );
  assert.ok(result);
  const parsed = new URL(result);
  assert.equal(parsed.searchParams.get("url"), "https://film-site-web.vercel.app/images/auth/login/login-1.webp");
  assert.equal(parsed.searchParams.get("w"), "640");
  assert.equal(parsed.searchParams.has("h"), false);
  assert.equal(parsed.searchParams.get("q"), "75");
});
