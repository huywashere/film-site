import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  TV_CATEGORIES,
  TV_CHANNELS,
  getChannelBySlug,
  getDefaultChannel,
  type TvChannel,
} from "./tv-channels.ts";

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

// ── CHALLENGE SUITE 1: ADVERSARIAL INPUT PROBING FOR getChannelBySlug ──

test("getChannelBySlug: extreme adversarial types do not crash or throw", () => {
  const adversarialTypes: unknown[] = [
    undefined,
    null,
    NaN,
    Infinity,
    -Infinity,
    0,
    1,
    -999,
    123456789,
    true,
    false,
    BigInt(9007199254740991),
    Symbol("vtv1"),
    {},
    { slug: "vtv1" },
    { toString: () => "vtv1" },
    { valueOf: () => "vtv1" },
    [],
    ["vtv1"],
    [null],
    () => "vtv1",
    new Date(),
    /vtv1/,
    new Uint8Array([1, 2, 3]),
  ];

  for (const input of adversarialTypes) {
    assert.doesNotThrow(
      () => {
        const result = getChannelBySlug(input as unknown as string);
        assert.equal(result, undefined, `Input ${String(input)} should evaluate to undefined`);
      },
      `getChannelBySlug threw on input ${String(input)}`,
    );
  }
});

test("getChannelBySlug: whitespace, null bytes, and unicode corner cases", () => {
  const whitespaceProbes = [
    "",
    " ",
    "   ",
    "\t",
    "\t\t",
    "\n",
    "\r\n",
    " \t \r\n \t ",
    "\0",
    "\0\0",
    "\u0000",
    "\u200B", // Zero-width space
    "\uFEFF", // Byte Order Mark
    "\u00A0", // Non-breaking space
  ];

  for (const probe of whitespaceProbes) {
    assert.equal(
      getChannelBySlug(probe),
      undefined,
      `Probe '${JSON.stringify(probe)}' should yield undefined`,
    );
  }

  // Probe with valid slug padded with various whitespace variants
  const paddedVtv1 = [
    "  vtv1",
    "vtv1  ",
    "  vtv1  ",
    "\tvtv1\t",
    "\r\nvtv1\r\n",
    "\n\t  vtv1  \t\n",
    "   VTV1   ",
  ];

  for (const padded of paddedVtv1) {
    const res = getChannelBySlug(padded);
    assert.ok(res, `Padded slug '${JSON.stringify(padded)}' should resolve to vtv1`);
    assert.equal(res?.id, "vtv1");
  }
});

test("getChannelBySlug: security injection and malicious payloads return undefined safely", () => {
  const maliciousPayloads = [
    // SQL Injection
    "' OR 1=1 --",
    "' UNION SELECT null, null, null --",
    "\"; DROP TABLE tv_channels; --",
    "1' or '1' = '1",
    "admin'--",

    // XSS / HTML Injection
    "<script>alert(1)</script>",
    "<img src=x onerror=alert('xss')>",
    "<svg/onload=alert(1)>",
    "javascript:alert(1)",
    "\"><script>document.cookie</script>",

    // Path traversal & Local file inclusion
    "../../../../etc/passwd",
    "..\\..\\windows\\system32\\cmd.exe",
    "/etc/shadow",
    "file:///etc/passwd",

    // Prototype pollution
    "__proto__",
    "constructor",
    "prototype",
    "toString",
    "valueOf",
    "hasOwnProperty",
    "isPrototypeOf",

    // Command injection
    "; ls -la",
    "| cat /etc/passwd",
    "$(whoami)",
    "`id`",

    // Server-Side Template Injection (SSTI) / Expression
    "${7*7}",
    "{{7*7}}",
    "#{7*7}",
    "<%= 7*7 %>",

    // Regex injection / ReDoS probes
    ".*",
    ".+",
    "^.*$",
    "[a-z]+",
    "(a+)+",
    "\\",
    "\\\\",
    "?#@",
  ];

  for (const payload of maliciousPayloads) {
    assert.doesNotThrow(() => {
      const res = getChannelBySlug(payload);
      assert.equal(res, undefined, `Malicious payload '${payload}' must yield undefined`);
    });
  }
});

test("getChannelBySlug: high-volume stress and string boundary limits", () => {
  // Extreme string length (100,000 chars)
  const hugeString = "a".repeat(100_000);
  assert.equal(getChannelBySlug(hugeString), undefined);

  const hugeWhitespace = " ".repeat(100_000);
  assert.equal(getChannelBySlug(hugeWhitespace), undefined);

  // Exact prefix / suffix partial matches must NOT resolve
  const nonExactMatches = [
    "vtv",
    "vtv1-fake",
    "vtv10",
    "pre-vtv1",
    "htv",
    "htv7-spoof",
    "thvl",
    "vtv33",
  ];

  for (const candidate of nonExactMatches) {
    assert.equal(
      getChannelBySlug(candidate),
      undefined,
      `Partial match '${candidate}' must not resolve`,
    );
  }
});

test("getDefaultChannel: catalog integrity and fallback invariance", () => {
  const defaultChannel = getDefaultChannel();
  assert.ok(defaultChannel, "Default channel must exist");
  assert.equal(defaultChannel.id, "vtv1");
  assert.equal(defaultChannel.slug, "vtv1");
  assert.ok(defaultChannel.streamUrl.startsWith("https://"), "Stream URL must be HTTPS");

  // Invariant: resolving the default channel's slug must return the default channel
  const resolved = getChannelBySlug(defaultChannel.slug);
  assert.equal(resolved?.id, defaultChannel.id);

  // Default channel must exist in TV_CHANNELS catalog
  const catalogEntry = TV_CHANNELS.find((c) => c.id === defaultChannel.id);
  assert.ok(catalogEntry, "Default channel must be present in TV_CHANNELS");
  assert.equal(catalogEntry?.id, defaultChannel.id);
});

// ── CHALLENGE SUITE 2: SSR DEEP LINK RESOLUTION EMULATION ──

test("SSR Channel Resolution: handles all searchParams permutations cleanly", async () => {
  // This mirrors the exact resolution logic in apps/web/src/app/tv/page.tsx:
  // const resolvedParams = await searchParams;
  // const channelParam =
  //   typeof resolvedParams?.channel === "string"
  //     ? resolvedParams.channel
  //     : Array.isArray(resolvedParams?.channel)
  //       ? resolvedParams.channel[0]
  //       : undefined;
  // const initialChannel = (channelParam ? getChannelBySlug(channelParam) : undefined) || getDefaultChannel();

  function resolveSsrChannel(resolvedParams: unknown): TvChannel {
    const params = resolvedParams as Record<string, string | string[] | undefined> | null | undefined;
    const channelParam =
      typeof params?.channel === "string"
        ? params.channel
        : Array.isArray(params?.channel)
          ? params.channel[0]
          : undefined;

    return (channelParam ? getChannelBySlug(channelParam) : undefined) || getDefaultChannel();
  }

  const defaultCh = getDefaultChannel();

  // 1. Valid deep links
  assert.equal(resolveSsrChannel({ channel: "vtv3" }).id, "vtv3");
  assert.equal(resolveSsrChannel({ channel: "htv7" }).id, "htv7");
  assert.equal(resolveSsrChannel({ channel: "thvl1" }).id, "thvl1");
  assert.equal(resolveSsrChannel({ channel: "HTV7" }).id, "htv7"); // case insensitive
  assert.equal(resolveSsrChannel({ channel: "  vtv1  " }).id, "vtv1"); // whitespace trimmed

  // 2. Unknown or invalid slugs fallback to default (VTV1)
  assert.equal(resolveSsrChannel({ channel: "unknown-slug" }).id, defaultCh.id);
  assert.equal(resolveSsrChannel({ channel: "vtv99" }).id, defaultCh.id);
  assert.equal(resolveSsrChannel({ channel: "" }).id, defaultCh.id);
  assert.equal(resolveSsrChannel({ channel: "   " }).id, defaultCh.id);
  assert.equal(resolveSsrChannel({ channel: "%20" }).id, defaultCh.id);
  assert.equal(resolveSsrChannel({ channel: "null" }).id, defaultCh.id);
  assert.equal(resolveSsrChannel({ channel: "undefined" }).id, defaultCh.id);

  // 3. Array parameters (e.g., duplicate query keys: /tv?channel=htv7&channel=vtv1)
  assert.equal(resolveSsrChannel({ channel: ["htv7", "vtv1"] }).id, "htv7");
  assert.equal(resolveSsrChannel({ channel: ["unknown", "vtv3"] }).id, defaultCh.id);
  assert.equal(resolveSsrChannel({ channel: [] }).id, defaultCh.id);
  assert.equal(resolveSsrChannel({ channel: [""] }).id, defaultCh.id);
  assert.equal(resolveSsrChannel({ channel: [null as unknown as string] }).id, defaultCh.id);

  // 4. Missing or unexpected searchParams shapes
  assert.equal(resolveSsrChannel({}).id, defaultCh.id);
  assert.equal(resolveSsrChannel({ otherParam: "foo" }).id, defaultCh.id);
  assert.equal(resolveSsrChannel(null).id, defaultCh.id);
  assert.equal(resolveSsrChannel(undefined).id, defaultCh.id);
  assert.equal(resolveSsrChannel(12345).id, defaultCh.id);
  assert.equal(resolveSsrChannel("string-instead-of-object").id, defaultCh.id);
  assert.equal(resolveSsrChannel(true).id, defaultCh.id);

  // 5. Hostile payloads in query parameter
  assert.equal(resolveSsrChannel({ channel: "<script>alert(1)</script>" }).id, defaultCh.id);
  assert.equal(resolveSsrChannel({ channel: "' OR 1=1 --" }).id, defaultCh.id);
  assert.equal(resolveSsrChannel({ channel: "__proto__" }).id, defaultCh.id);
  assert.equal(resolveSsrChannel({ channel: "constructor" }).id, defaultCh.id);
});

// ── CHALLENGE SUITE 3: STREAM ERROR FAILOVER ENGINE & FALLBACK STATE MACHINE ──

test("Stream Failover Engine: multi-source channel steps through all backups before showing fallback UI", () => {
  // Mock channel with 1 primary + 2 backups
  const mockChannel: TvChannel = {
    id: "test-channel",
    slug: "test-channel",
    name: "Test Channel HD",
    shortName: "TEST",
    category: "vtv",
    categoryName: "VTV",
    description: "Test description",
    streamUrl: "https://primary.example.com/live.m3u8",
    backupStreamUrls: [
      "https://backup1.example.com/live.m3u8",
      "https://backup2.example.com/live.m3u8",
    ],
    resolution: "1080p Full HD",
    broadcaster: "Test Broadcaster",
  };

  // State machine simulation matching TvClient.tsx
  const allStreamUrls = [mockChannel.streamUrl, ...(mockChannel.backupStreamUrls || [])].filter(Boolean);
  assert.equal(allStreamUrls.length, 3);

  let activeSourceIndex = 0;
  let playerError: string | null = null;
  let reloadKey = 0;

  function handlePlayerError() {
    if (activeSourceIndex < allStreamUrls.length - 1) {
      activeSourceIndex += 1;
      reloadKey += 1;
    } else {
      playerError = "Luồng phát hiện đang gián đoạn hoặc đài truyền hình đang bảo trì tín hiệu.";
    }
  }

  function handleRetryChannel() {
    playerError = null;
    activeSourceIndex = 0;
    reloadKey += 1;
  }

  function handleSwitchSource() {
    activeSourceIndex = (activeSourceIndex + 1) % allStreamUrls.length;
    playerError = null;
    reloadKey += 1;
  }

  // 1. Initial state
  assert.equal(activeSourceIndex, 0);
  assert.equal(allStreamUrls[activeSourceIndex], "https://primary.example.com/live.m3u8");
  assert.equal(playerError, null);
  assert.equal(reloadKey, 0);

  // 2. Primary fails -> switches to backup 1
  handlePlayerError();
  assert.equal(activeSourceIndex, 1);
  assert.equal(allStreamUrls[activeSourceIndex], "https://backup1.example.com/live.m3u8");
  assert.equal(playerError, null);
  assert.equal(reloadKey, 1);

  // 3. Backup 1 fails -> switches to backup 2
  handlePlayerError();
  assert.equal(activeSourceIndex, 2);
  assert.equal(allStreamUrls[activeSourceIndex], "https://backup2.example.com/live.m3u8");
  assert.equal(playerError, null);
  assert.equal(reloadKey, 2);

  // 4. Backup 2 fails -> all sources exhausted -> activates in-player fallback overlay
  handlePlayerError();
  assert.equal(activeSourceIndex, 2);
  assert.ok(playerError !== null);
  assert.match(playerError!, /gián đoạn/);

  // 5. User clicks "Thử kết nối lại" -> resets to primary
  handleRetryChannel();
  assert.equal(activeSourceIndex, 0);
  assert.equal(playerError, null);
  assert.equal(reloadKey, 3);

  // 6. Manual source switching wraps around cleanly
  handleSwitchSource();
  assert.equal(activeSourceIndex, 1);
  handleSwitchSource();
  assert.equal(activeSourceIndex, 2);
  handleSwitchSource();
  assert.equal(activeSourceIndex, 0);
});

test("Stream Failover Engine: single-source channel displays fallback UI on first error without crashing", () => {
  const singleSourceChannel: TvChannel = {
    id: "single-channel",
    slug: "single-channel",
    name: "Single Channel",
    shortName: "SINGLE",
    category: "sports",
    categoryName: "Thể Thao",
    description: "Single source",
    streamUrl: "https://single.example.com/live.m3u8",
    backupStreamUrls: [],
    resolution: "1080p Full HD",
    broadcaster: "Single",
  };

  const allStreamUrls = [singleSourceChannel.streamUrl, ...(singleSourceChannel.backupStreamUrls || [])].filter(Boolean);
  assert.equal(allStreamUrls.length, 1);

  let activeSourceIndex = 0;
  let playerError: string | null = null;

  function handlePlayerError() {
    if (activeSourceIndex < allStreamUrls.length - 1) {
      activeSourceIndex += 1;
    } else {
      playerError = "Luồng phát hiện đang gián đoạn hoặc đài truyền hình đang bảo trì tín hiệu.";
    }
  }

  // Error occurs
  handlePlayerError();
  assert.equal(activeSourceIndex, 0);
  assert.ok(playerError !== null);
  assert.match(playerError!, /gián đoạn/);
});

// ── CHALLENGE SUITE 4: STRUCTURAL COMPLIANCE & NAVIGATION CHECKS ──

test("Sidebar.tsx: Live TV route is permanently pinned in isPinnedPage", () => {
  const sidebarCode = readSource("src/components/layout/Sidebar.tsx");

  // Verify /tv is pinned
  assert.match(
    sidebarCode,
    /isTvPage\s*=\s*pathname\s*===\s*["']\/tv["']/,
    "Sidebar.tsx must define isTvPage",
  );
  assert.match(
    sidebarCode,
    /isPinnedPage\s*=[^;]*isTvPage/,
    "isPinnedPage in Sidebar.tsx must include isTvPage",
  );
});

test("page.tsx: declares force-dynamic and satisfies interface contracts", () => {
  const pageCode = readSource("src/app/tv/page.tsx");

  assert.match(
    pageCode,
    /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/,
    "page.tsx must export dynamic = 'force-dynamic' to prevent static pre-rendering",
  );

  assert.match(
    pageCode,
    /searchParams:\s*Promise</,
    "TvPage must accept searchParams as a Promise",
  );

  assert.match(
    pageCode,
    /<TvClient\s+initialChannel=\{initialChannel\}/,
    "page.tsx must pass resolved initialChannel to TvClient",
  );
});

test("error.tsx: exists and provides recovery boundary for /tv route", () => {
  const errorCode = readSource("src/app/tv/error.tsx");

  assert.ok(errorCode.includes('"use client"'), "error.tsx must be a client component");
  assert.match(
    errorCode,
    /export\s+default\s+function\s+TvError/,
    "error.tsx must export TvError component",
  );
  assert.match(
    errorCode,
    /reset\(\)/,
    "TvError must provide reset() retry handler",
  );
});

test("loading.tsx: exists and provides skeleton for /tv route", () => {
  const loadingCode = readSource("src/app/tv/loading.tsx");

  assert.match(
    loadingCode,
    /export\s+default\s+function\s+TvLoading/,
    "loading.tsx must export TvLoading component",
  );
  assert.ok(
    loadingCode.includes("animate-pulse"),
    "loading.tsx must contain skeleton pulse animation",
  );
});
