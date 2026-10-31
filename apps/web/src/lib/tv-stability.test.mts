import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  TV_CATEGORIES,
  TV_CHANNELS,
  getChannelBySlug,
  getDefaultChannel,
  type TvCategory,
  type TvChannel,
} from "./tv-channels.ts";
import {
  isDirectHlsAllowedByCsp,
  selectInitialHlsTransport,
} from "./player-source-routing.ts";

function readSource(relativePath: string): string {
  const candidates = [
    resolve(process.cwd(), relativePath),
    resolve(process.cwd(), "apps/web", relativePath),
    resolve(process.cwd(), "..", relativePath),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return readFileSync(candidate, "utf8");
    }
  }
  return readFileSync(relativePath, "utf8");
}

// ── 1. TV CHANNELS CATALOG & HELPER TESTS ──

test("getChannelBySlug handles undefined, null, non-string, and empty input safely without throwing", () => {
  // Input safety: never crash on undefined, null, whitespace, or invalid types
  assert.equal(getChannelBySlug(undefined as unknown as string), undefined);
  assert.equal(getChannelBySlug(null as unknown as string), undefined);
  assert.equal(getChannelBySlug(""), undefined);
  assert.equal(getChannelBySlug("   "), undefined);
  assert.equal(getChannelBySlug("\t\n  "), undefined);
  assert.equal(getChannelBySlug(123 as unknown as string), undefined);
  assert.equal(getChannelBySlug({} as unknown as string), undefined);
  assert.equal(getChannelBySlug([] as unknown as string), undefined);
});

test("getChannelBySlug resolves channels by valid slug, ID, or shortName", () => {
  // Lookup by canonical slug
  const vtv1 = getChannelBySlug("vtv1");
  assert.ok(vtv1, "vtv1 channel should be found");
  assert.equal(vtv1?.id, "vtv1");
  assert.equal(vtv1?.slug, "vtv1");

  const vtv3 = getChannelBySlug("vtv3");
  assert.ok(vtv3, "vtv3 channel should be found");
  assert.equal(vtv3?.id, "vtv3");

  const htv7 = getChannelBySlug("htv7");
  assert.ok(htv7, "htv7 channel should be found");
  assert.equal(htv7?.id, "htv7");

  const thvl1 = getChannelBySlug("thvl1");
  assert.ok(thvl1, "thvl1 channel should be found");
  assert.equal(thvl1?.id, "thvl1");

  const redbull = getChannelBySlug("redbull");
  assert.ok(redbull, "redbull channel should be found");
  assert.equal(redbull?.id, "redbull");

  // Lookup by hyphenated ID
  const vtv5Tnb = getChannelBySlug("vtv5-tnb");
  assert.ok(vtv5Tnb, "vtv5-tnb should be found by ID");
  assert.equal(vtv5Tnb?.id, "vtv5-tnb");

  // Lookup by shortName
  const vtv1ByShort = getChannelBySlug("VTV1");
  assert.ok(vtv1ByShort, "VTV1 should be found by shortName");
  assert.equal(vtv1ByShort?.id, "vtv1");

  const htv7ByShort = getChannelBySlug("HTV7");
  assert.ok(htv7ByShort, "HTV7 should be found by shortName");
  assert.equal(htv7ByShort?.id, "htv7");
});

test("getChannelBySlug is case-insensitive and trims whitespace", () => {
  assert.equal(getChannelBySlug("VTV1")?.id, "vtv1");
  assert.equal(getChannelBySlug("vTv3")?.id, "vtv3");
  assert.equal(getChannelBySlug("  vtv1  ")?.id, "vtv1");
  assert.equal(getChannelBySlug("\n\tTHVL1\t")?.id, "thvl1");
  assert.equal(getChannelBySlug("  htv7   ")?.id, "htv7");
  assert.equal(getChannelBySlug(" RedBull ")?.id, "redbull");
});

test("getChannelBySlug returns undefined for non-existent channels", () => {
  assert.equal(getChannelBySlug("non-existent-channel-slug"), undefined);
  assert.equal(getChannelBySlug("vtv99"), undefined);
  assert.equal(getChannelBySlug("random_text_123"), undefined);
});

test("getDefaultChannel returns a valid default channel with complete metadata", () => {
  const defaultChannel = getDefaultChannel();
  assert.ok(defaultChannel, "Default channel must exist");
  assert.equal(defaultChannel.id, "vtv1");
  assert.equal(defaultChannel.slug, "vtv1");
  assert.ok(defaultChannel.name.length > 0, "Default channel must have a name");
  assert.ok(
    defaultChannel.streamUrl.startsWith("https://"),
    "Default stream URL must be HTTPS",
  );
  assert.equal(defaultChannel.category, "vtv");
  assert.ok(defaultChannel.resolution.length > 0, "Default channel must have resolution");
});

test("TV_CATEGORIES covers all expected broadcast categories", () => {
  const expectedCategoryIds: TvCategory[] = [
    "all",
    "vtv",
    "htv",
    "local",
    "sports",
    "international",
  ];

  const categoryIds = TV_CATEGORIES.map((c) => c.id);
  for (const expected of expectedCategoryIds) {
    assert.ok(
      categoryIds.includes(expected),
      `TV_CATEGORIES must include category '${expected}'`,
    );
  }

  // Every category item must have non-empty name
  for (const cat of TV_CATEGORIES) {
    assert.ok(cat.id.length > 0, "Category id must not be empty");
    assert.ok(cat.name.length > 0, `Category '${cat.id}' must have a non-empty name`);
  }

  // IDs must be unique
  const uniqueIds = new Set(categoryIds);
  assert.equal(uniqueIds.size, categoryIds.length, "Category IDs must be unique");
});

test("TV_CHANNELS covers every content category with populated channel entries", () => {
  const contentCategories: TvCategory[] = [
    "vtv",
    "htv",
    "local",
    "sports",
    "international",
  ];

  for (const category of contentCategories) {
    const channelsInCategory = TV_CHANNELS.filter((c) => c.category === category);
    assert.ok(
      channelsInCategory.length > 0,
      `Category '${category}' must contain at least one channel in TV_CHANNELS`,
    );
  }

  // Popular channels exist for featured showcase
  const popularChannels = TV_CHANNELS.filter((c) => c.isPopular);
  assert.ok(
    popularChannels.length >= 3,
    "TV_CHANNELS must include popular channels for featured showcase",
  );
});

test("TV_CHANNELS maintains unique IDs and valid stream URLs across all channels", () => {
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();

  assert.ok(
    TV_CHANNELS.length >= 20,
    `Expected at least 20 channels, found ${TV_CHANNELS.length}`,
  );

  for (const channel of TV_CHANNELS) {
    // Unique identifier check
    assert.ok(!seenIds.has(channel.id), `Duplicate channel id '${channel.id}' found`);
    assert.ok(!seenSlugs.has(channel.slug), `Duplicate channel slug '${channel.slug}' found`);
    seenIds.add(channel.id);
    seenSlugs.add(channel.slug);

    // Required fields check
    assert.ok(channel.id.trim().length > 0, "Channel id must not be empty");
    assert.ok(channel.slug.trim().length > 0, "Channel slug must not be empty");
    assert.ok(channel.name.trim().length > 0, `Channel '${channel.id}' must have a name`);
    assert.ok(
      channel.shortName.trim().length > 0,
      `Channel '${channel.id}' must have a shortName`,
    );
    assert.ok(
      channel.categoryName.trim().length > 0,
      `Channel '${channel.id}' must have a categoryName`,
    );
    assert.ok(
      channel.broadcaster.trim().length > 0,
      `Channel '${channel.id}' must have a broadcaster`,
    );
    assert.ok(
      channel.resolution.trim().length > 0,
      `Channel '${channel.id}' must have a resolution`,
    );

    // Category validity check
    assert.ok(
      ["vtv", "htv", "local", "sports", "international"].includes(channel.category),
      `Channel '${channel.id}' has invalid category '${channel.category}'`,
    );

    // Stream URL check
    assert.ok(
      channel.streamUrl.startsWith("https://") || channel.streamUrl.startsWith("http://"),
      `Channel '${channel.id}' must have a valid streamUrl starting with http(s)://`,
    );
    assert.ok(
      channel.streamUrl.includes(".m3u8"),
      `Channel '${channel.id}' streamUrl must point to an HLS m3u8 playlist`,
    );

    // Backup URLs check if present
    if (channel.backupStreamUrls) {
      assert.ok(
        Array.isArray(channel.backupStreamUrls),
        `Channel '${channel.id}' backupStreamUrls must be an array`,
      );
      for (const backupUrl of channel.backupStreamUrls) {
        assert.ok(
          backupUrl.startsWith("https://") || backupUrl.startsWith("http://"),
          `Channel '${channel.id}' backup stream URL must be HTTP(S)`,
        );
        assert.ok(
          backupUrl.includes(".m3u8"),
          `Channel '${channel.id}' backup stream URL must point to .m3u8`,
        );
      }
    }

    // Logo URL check if present
    if (channel.logoUrl) {
      assert.ok(
        channel.logoUrl.startsWith("https://") || channel.logoUrl.startsWith("http://"),
        `Channel '${channel.id}' logoUrl must start with http(s)://`,
      );
    }
  }
});

// ── 2. PLAYER SOURCE ROUTING & TRANSPORT SELECTION TESTS ──

test("selectInitialHlsTransport selects direct live URL as primary when permitted by CSP", () => {
  const directLiveUrl = "https://1011154949.vnns.net/CDN-FPT02/VTV1-HD-1080p/playlist.m3u8";
  const proxyUrl = "/api/hls-proxy?url=signed-token";

  // When preferSameOrigin is false and direct is allowed by CSP
  // primary should be directUrl, fallback should be proxyUrl
  const desktopTransport = selectInitialHlsTransport(directLiveUrl, proxyUrl, false);
  assert.equal(desktopTransport.primary, directLiveUrl);
  assert.equal(desktopTransport.fallback, proxyUrl);

  // Without proxyUrl, primary is directUrl and fallback is undefined
  const noProxyTransport = selectInitialHlsTransport(directLiveUrl, undefined, false);
  assert.equal(noProxyTransport.primary, directLiveUrl);
  assert.equal(noProxyTransport.fallback, undefined);
});

test("selectInitialHlsTransport prefers same-origin proxy on mobile and retains direct fallback", () => {
  const directLiveUrl = "https://1011154949.vnns.net/CDN-FPT02/VTV1-HD-1080p/playlist.m3u8";
  const proxyUrl = "/api/hls-proxy?url=signed-token";

  // Mobile/constrained mode prefers same origin proxy
  const mobileTransport = selectInitialHlsTransport(directLiveUrl, proxyUrl, true);
  assert.equal(mobileTransport.primary, proxyUrl);
  assert.equal(mobileTransport.fallback, directLiveUrl);
});

test("selectInitialHlsTransport discards blocked or unlisted direct URLs without using them as fallback", () => {
  const unlistedUrl = "https://untrusted-live-origin.example.com/live/stream.m3u8";
  const proxyUrl = "/api/hls-proxy?url=signed-token";

  // If directUrl is not permitted by CSP, transport must default to proxy and never fallback to blocked URL
  const transport = selectInitialHlsTransport(unlistedUrl, proxyUrl, false);
  assert.equal(transport.primary, proxyUrl);
  assert.equal(transport.fallback, undefined);
});

test("selectInitialHlsTransport handles live fallback backup URLs safely", () => {
  const backupStreamUrl = "https://luuchieu.truyenhinhso.vn/media/live/C90B082632CD4A75F4B3EDB3/index.m3u8";
  const proxyBackupUrl = "/api/hls-proxy?url=backup-signed";

  // When switching to backup stream, direct playback is routed correctly
  const backupDirect = selectInitialHlsTransport(backupStreamUrl, undefined, false);
  assert.equal(backupDirect.primary, backupStreamUrl);
  assert.equal(backupDirect.fallback, undefined);

  const backupWithProxy = selectInitialHlsTransport(backupStreamUrl, proxyBackupUrl, false);
  assert.equal(backupWithProxy.primary, backupStreamUrl);
  assert.equal(backupWithProxy.fallback, proxyBackupUrl);

  // Fallback with same-origin preference
  const backupMobile = selectInitialHlsTransport(backupStreamUrl, proxyBackupUrl, true);
  assert.equal(backupMobile.primary, proxyBackupUrl);
  assert.equal(backupMobile.fallback, backupStreamUrl);
});

test("selectInitialHlsTransport handles empty and invalid inputs gracefully", () => {
  const proxyUrl = "/api/hls-proxy?url=signed";
  assert.deepEqual(selectInitialHlsTransport("", proxyUrl, false), {
    primary: proxyUrl,
    fallback: undefined,
  });
  assert.deepEqual(selectInitialHlsTransport("", undefined, false), {
    primary: "",
    fallback: undefined,
  });
  // Non-relative proxy URL is discarded
  assert.deepEqual(
    selectInitialHlsTransport("https://1011154949.vnns.net/test.m3u8", "https://evil.com/proxy", false),
    {
      primary: "https://1011154949.vnns.net/test.m3u8",
      fallback: undefined,
    },
  );
});

// ── 3. LIVE BROADCAST CDN PERMISSION TESTS (isDirectHlsAllowedByCsp) ──

test("isDirectHlsAllowedByCsp permits all official live TV broadcast CDN domains", () => {
  const officialLiveStreamUrls = [
    // VTV & FPT CDN
    "https://1011154949.vnns.net/CDN-FPT02/VTV1-HD-1080p/playlist.m3u8",
    "https://stream.vnns.net/live/vtv3.m3u8",
    // VTV Digital / SCTV DRM
    "https://vtvgolive-sctvdrm.vtvdigital.vn/manifest/vtv2/playlist_360p.m3u8",
    "https://cdn.vtvdigital.vn/live/vtv4.m3u8",
    // Truyen Hinh So
    "https://luuchieu.truyenhinhso.vn/media/live/C90B082632CD4A75F4B3EDB3/index.m3u8",
    // FreeM3U CDN
    "https://freem3u.xyz/api/live/play.m3u8?vid=3",
    // VTV Prime
    "https://liveh12.vtvprime.vn/hls/ANNINHTV/index.m3u8",
    // Mediatech VN (Đà Nẵng, Đồng Nai, Tây Ninh)
    "https://live.mediatech.vn/live/285b59a111d76974225a8e3004bfc31a509/chunklist.m3u8",
    "https://cdn.mediatech.vn/dongnai/tv1live-transmux.m3u8",
    // Cần Thơ TV
    "https://live.canthotv.vn/live/tv/chunklist.m3u8",
    // Akamaized (Red Bull TV, Sky News, DW, NASA)
    "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
    "https://skynewsau-live.akamaized.net/hls/live/2002689/skynewsau-extra1/master.m3u8",
    "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8",
    "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8",
    // TRT World
    "https://tv-trtworld.medya.trt.com.tr/master.m3u8",
    // CGTN News
    "https://news.cgtn.com/resource/live/english/cgtn-news.m3u8",
  ];

  for (const url of officialLiveStreamUrls) {
    assert.equal(
      isDirectHlsAllowedByCsp(url),
      true,
      `isDirectHlsAllowedByCsp should allow official live broadcast URL: ${url}`,
    );
  }
});

test("isDirectHlsAllowedByCsp rejects insecure protocols and untrusted origins", () => {
  // Insecure HTTP is forbidden even for known domains
  assert.equal(
    isDirectHlsAllowedByCsp("http://1011154949.vnns.net/CDN-FPT02/VTV1-HD-1080p/playlist.m3u8"),
    false,
    "HTTP protocol must be rejected",
  );
  assert.equal(
    isDirectHlsAllowedByCsp("http://live.mediatech.vn/live/chunklist.m3u8"),
    false,
    "HTTP protocol must be rejected",
  );

  // Untrusted external origins
  assert.equal(
    isDirectHlsAllowedByCsp("https://evil-hls-hijacker.com/stream.m3u8"),
    false,
  );
  assert.equal(
    isDirectHlsAllowedByCsp("https://unknown-cdn.ru/live/test.m3u8"),
    false,
  );

  // Suffix / subdomain spoofing attempts
  assert.equal(
    isDirectHlsAllowedByCsp("https://vnns.net.evil-attacker.org/stream.m3u8"),
    false,
    "Domain suffix spoofing must be rejected",
  );
  assert.equal(
    isDirectHlsAllowedByCsp("https://vtvdigital.vn.phishing-site.com/live.m3u8"),
    false,
    "Domain suffix spoofing must be rejected",
  );
  assert.equal(
    isDirectHlsAllowedByCsp("https://akamaized.net.rogue-server.net/test.m3u8"),
    false,
    "Domain suffix spoofing must be rejected",
  );

  // Malformed input
  assert.equal(isDirectHlsAllowedByCsp(""), false);
  assert.equal(isDirectHlsAllowedByCsp("not-a-valid-url"), false);
  assert.equal(isDirectHlsAllowedByCsp("javascript:alert('xss')"), false);
});

// ── 4. CONTENT SECURITY POLICY (CSP) DIRECTIVES IN proxy.ts ──

test("proxy.ts CSP includes all required live broadcast CDNs in connect-src and media-src", () => {
  const proxyCode = readSource("src/proxy.ts");

  // Required CDN domain suffixes for live TV streaming
  const requiredTvCdns = [
    "vnns.net",
    "vtvdigital.vn",
    "truyenhinhso.vn",
    "freem3u.xyz",
    "vtvprime.vn",
    "mediatech.vn",
    "canthotv.vn",
    "akamaized.net",
    "trt.com.tr",
    "cgtn.com",
  ];

  // Extract connect-src directive line
  const connectSrcMatch = proxyCode.match(/connect-src\s+([^;]+)/);
  assert.ok(connectSrcMatch, "proxy.ts must define a connect-src CSP directive");
  const connectSrc = connectSrcMatch![1];

  for (const cdn of requiredTvCdns) {
    assert.ok(
      connectSrc.includes(cdn),
      `connect-src in proxy.ts must include live broadcast CDN '${cdn}'`,
    );
  }

  // Extract media-src directive line
  const mediaSrcMatch = proxyCode.match(/media-src\s+([^;]+)/);
  assert.ok(mediaSrcMatch, "proxy.ts must define a media-src CSP directive");
  const mediaSrc = mediaSrcMatch![1];

  for (const cdn of requiredTvCdns) {
    assert.ok(
      mediaSrc.includes(cdn),
      `media-src in proxy.ts must include live broadcast CDN '${cdn}'`,
    );
  }
});

test("proxy.ts CSP includes live TV channel logo hosts in img-src", () => {
  const proxyCode = readSource("src/proxy.ts");

  const requiredLogoHosts = [
    "postimg.cc",
    "imgur.com",
    "static.wikia.nocookie.net",
  ];

  const imgSrcMatch = proxyCode.match(/img-src\s+([^;]+)/);
  assert.ok(imgSrcMatch, "proxy.ts must define an img-src CSP directive");
  const imgSrc = imgSrcMatch![1];

  for (const host of requiredLogoHosts) {
    assert.ok(
      imgSrc.includes(host),
      `img-src in proxy.ts must include TV logo host '${host}'`,
    );
  }
});

test("proxy.ts CSP maintains strict isolation without wildcards for media and connect", () => {
  const proxyCode = readSource("src/proxy.ts");

  // Neither connect-src nor media-src should have unrestricted wildcards
  assert.doesNotMatch(
    proxyCode,
    /connect-src[^;]*\shttps:\s/,
    "connect-src must not allow unrestricted https: wildcard",
  );
  assert.doesNotMatch(
    proxyCode,
    /media-src[^;]*\shttps:\s/,
    "media-src must not allow unrestricted https: wildcard",
  );
  assert.doesNotMatch(
    proxyCode,
    /connect-src[^;]*\s\*\s/,
    "connect-src must not allow blanket '*' wildcard",
  );
  assert.doesNotMatch(
    proxyCode,
    /media-src[^;]*\s\*\s/,
    "media-src must not allow blanket '*' wildcard",
  );
});
