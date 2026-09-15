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

test("universe carousel decodes title logos before every slide activation", () => {
  const source = readFileSync(
    "src/components/universe/UniversePageClient.tsx",
    "utf8",
  );

  assert.match(source, /const activateSpotlight = useCallback/);
  assert.match(
    source,
    /await preloadUniverseLogo\(spotlights\[nextIndex\]\?\.titleLogo\)/,
  );
  assert.match(source, /onClick=\{\(\) => void activateSpotlight\(idx\)\}/);
  assert.match(source, /void activateSpotlight\(currentIdx \+ 1\)/);
  assert.match(source, /isReady \? "opacity-100" : "opacity-0"/);
  assert.match(source, /spotlights\.map\(\(item, idx\) => \(/);
  assert.match(source, /data-universe-logo-active=\{idx === currentIdx\}/);
  assert.doesNotMatch(source, /key=\{activeSpotlight\.slug\}/);
});

test("anime universe hero stays visible and uses solid franchise actions", () => {
  const source = readFileSync(
    "src/components/universe/UniversePageClient.tsx",
    "utf8",
  );

  assert.match(source, /h-\[100dvh\]/);
  assert.match(source, /2xl:flex-row/);
  assert.doesNotMatch(source, /lg:flex-row/);
  assert.match(source, /data-universe-action="watch"/);
  assert.match(source, /data-universe-action="explore"/);
  assert.match(source, /isDoraemon[\s\S]*bg-\[#21a7db\]/);
  assert.match(source, /isConan[\s\S]*bg-\[#d83232\]/);
  assert.doesNotMatch(source, /backdrop-blur/);
});
