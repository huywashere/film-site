import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CONAN_SPOTLIGHTS } from "./conan-catalog.ts";
import { DORAEMON_SPOTLIGHTS } from "./doraemon-catalog.ts";

test("Doraemon and Conan spotlights ship movie-specific TMDB title logos", () => {
  for (const spotlight of [...DORAEMON_SPOTLIGHTS, ...CONAN_SPOTLIGHTS]) {
    assert.match(
      spotlight.titleLogo,
      /^https:\/\/image\.tmdb\.org\/t\/p\/w500\/.+\.png$/,
      `${spotlight.slug} must include a pre-resolved title logo`,
    );
  }
});

test("universe spotlights optimize title logos through wsrv with safe fallbacks", () => {
  const source = readFileSync(
    "src/components/universe/UniversePageClient.tsx",
    "utf8",
  );

  assert.match(source, /buildArtworkCandidates\(\[titleLogo\], "titleLogo"/);
  assert.match(source, /preferEdge: titleLogo\.includes\("image\.tmdb\.org"\)/);
  assert.match(source, /alt=""[\s\S]*aria-hidden="true"/);
  assert.doesNotMatch(source, /\/images\/logos\/(?:doraemon|conan)-logo\.svg/);
});
