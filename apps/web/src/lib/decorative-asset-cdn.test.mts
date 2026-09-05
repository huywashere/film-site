import assert from "node:assert/strict";
import test from "node:test";

import {
  applyLocalDecorativeAssetFallback,
  decorativeAssetUrl,
  normalizeDecorativeAssetCdnBase,
} from "./decorative-asset-cdn";

const PINNED_BASE =
  "https://cdn.jsdelivr.net/gh/netphim/assets@0123456789abcdef/public";

test("builds a pinned jsDelivr URL for a local decorative asset", () => {
  assert.equal(
    decorativeAssetUrl("/images/cat1-thumbnail.webp", PINNED_BASE),
    `${PINNED_BASE}/images/cat1-thumbnail.webp`,
  );
});

test("keeps the local URL when CDN is disabled or invalid", () => {
  assert.equal(
    decorativeAssetUrl("/images/cat1-thumbnail.webp", ""),
    "/images/cat1-thumbnail.webp",
  );
  assert.equal(
    decorativeAssetUrl(
      "/images/cat1-thumbnail.webp",
      "https://example.com/assets",
    ),
    "/images/cat1-thumbnail.webp",
  );
  assert.equal(
    normalizeDecorativeAssetCdnBase("http://cdn.jsdelivr.net/x"),
    "",
  );
});

test("does not join unsafe or protocol-relative asset paths", () => {
  assert.equal(
    decorativeAssetUrl("//tracker.example/pixel", PINNED_BASE),
    "//tracker.example/pixel",
  );
  assert.equal(
    decorativeAssetUrl("/images/../secret", PINNED_BASE),
    "/images/../secret",
  );
});

test("falls back locally once without creating an error loop", () => {
  const removedAttributes: string[] = [];
  const image = {
    dataset: {},
    src: `${PINNED_BASE}/avatars/collectibles/neon-cat.webp`,
    removeAttribute(name: string) {
      removedAttributes.push(name);
    },
  } as unknown as HTMLImageElement;

  assert.equal(
    applyLocalDecorativeAssetFallback(
      image,
      "/avatars/collectibles/neon-cat.webp",
    ),
    true,
  );
  assert.equal(image.src, "/avatars/collectibles/neon-cat.webp");
  assert.deepEqual(removedAttributes, ["srcset"]);
  assert.equal(
    applyLocalDecorativeAssetFallback(
      image,
      "/avatars/collectibles/neon-cat.webp",
    ),
    false,
  );
});
