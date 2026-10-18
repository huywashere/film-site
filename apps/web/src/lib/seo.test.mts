import test from "node:test";
import assert from "node:assert/strict";
import {
  getSiteUrl,
  absoluteUrl,
  resolveOgImageUrl,
  buildSeoMetadata,
  DEFAULT_OG_IMAGE_PATH,
} from "./seo";

test("getSiteUrl ignores dead netphim.app placeholder and uses live domain", () => {
  const prevSite = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    process.env.NEXT_PUBLIC_SITE_URL = "https://netphim.app";
    const url = getSiteUrl();
    assert.ok(!url.includes("netphim.app"), "Must not use netphim.app");
    assert.ok(url.startsWith("https://"), "Must start with https://");
  } finally {
    process.env.NEXT_PUBLIC_SITE_URL = prevSite;
  }
});

test("absoluteUrl converts relative paths to full live URLs", () => {
  const url = absoluteUrl("/og-img/background.png");
  assert.ok(url.startsWith("https://"));
  assert.ok(url.endsWith("/og-img/background.png"));
});

test("absoluteUrl sanitizes dead netphim.app links", () => {
  const url = absoluteUrl("https://netphim.app/film/mai");
  assert.ok(!url.includes("netphim.app"));
  assert.ok(url.endsWith("/film/mai"));
});

test("resolveOgImageUrl provides valid fallback when candidate is empty", () => {
  const empty = resolveOgImageUrl(null);
  assert.ok(empty.endsWith(DEFAULT_OG_IMAGE_PATH));
  assert.ok(empty.startsWith("https://"));
});

test("resolveOgImageUrl handles TMDB CDN images directly", () => {
  const tmdb = resolveOgImageUrl("https://image.tmdb.org/t/p/w1280/sample.jpg");
  assert.equal(tmdb, "https://image.tmdb.org/t/p/w1280/sample.jpg");
});

test("buildSeoMetadata creates complete openGraph and twitter cards", () => {
  const meta = buildSeoMetadata({
    title: "Vũ Trụ Marvel Studios | FlexPhim",
    description: "Khám phá toàn bộ bom tấn Marvel Studios.",
    path: "/universe/marvel",
    imageUrl: "https://image.tmdb.org/t/p/w1280/marvel-banner.jpg",
    type: "website",
  });

  assert.equal(meta.title, "Vũ Trụ Marvel Studios | FlexPhim");
  assert.equal(meta.description, "Khám phá toàn bộ bom tấn Marvel Studios.");
  assert.equal(meta.alternates?.canonical, `${getSiteUrl()}/universe/marvel`);

  const og = meta.openGraph as any;
  assert.ok(og);
  assert.equal(og.url, `${getSiteUrl()}/universe/marvel`);
  assert.equal(og.siteName, "FlexPhim");
  assert.equal(og.images[0].url, "https://image.tmdb.org/t/p/w1280/marvel-banner.jpg");
  assert.equal(og.images[0].width, 1200);
  assert.equal(og.images[0].height, 630);

  const tw = meta.twitter as any;
  assert.ok(tw);
  assert.equal(tw.card, "summary_large_image");
  assert.equal(tw.images[0], "https://image.tmdb.org/t/p/w1280/marvel-banner.jpg");
});
