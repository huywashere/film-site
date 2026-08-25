import assert from "node:assert/strict";
import test from "node:test";
import {
  buildArtworkCandidates,
  isPreOptimizedImageUrl,
  localImageProxyUrl,
  unwrapImageUrl,
  wsrvImageUrl,
} from "./image-cdn.ts";

const provider = "https://phimimg.com/uploads/movies/example.webp";

test("builds deterministic wsrv presets", () => {
  const result = wsrvImageUrl(provider, "poster");
  assert.ok(result);
  const parsed = new URL(result);
  assert.equal(parsed.hostname, "wsrv.nl");
  assert.equal(parsed.searchParams.get("url"), provider);
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

test("deduplicates proxied and direct copies of the same source", () => {
  const candidates = buildArtworkCandidates(
    [provider, wsrvImageUrl(provider, "poster"), localImageProxyUrl(provider)],
    "poster",
  );
  assert.equal(candidates.filter((value) => value === provider).length, 1);
  assert.equal(candidates.length, 3);
});
