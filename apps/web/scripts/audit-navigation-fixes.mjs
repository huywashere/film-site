import { chromium } from "@playwright/test";

const baseURL = process.env.AUDIT_BASE_URL || "http://127.0.0.1:3101";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  serviceWorkers: "allow",
});
const page = await context.newPage();
const consoleErrors = [];
const navigationTrace = [];
const failedResources = [];
const pageErrors = [];
const rscPayloads = [];

page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));
page.on("requestfailed", (request) =>
  failedResources.push({
    event: "failed",
    url: request.url(),
    reason: request.failure()?.errorText,
  }),
);
page.on("request", (request) => {
  if (
    request.resourceType() === "document" ||
    request.headers()["rsc"] === "1"
  ) {
    navigationTrace.push({
      event: "request",
      url: request.url(),
      headers: request.headers()["rsc"] === "1" ? request.headers() : undefined,
    });
  }
});
page.on("response", async (response) => {
  const request = response.request();
  if (response.status() >= 400) {
    failedResources.push({
      event: "response",
      status: response.status(),
      url: response.url(),
    });
  }
  if (
    request.resourceType() === "document" ||
    request.headers()["rsc"] === "1"
  ) {
    navigationTrace.push({
      event: "response",
      status: response.status(),
      url: response.url(),
    });
  }
  if (request.headers()["rsc"] === "1") {
    try {
      const body = await response.text();
      rscPayloads.push({
        url: response.url(),
        bytes: body.length,
        start: body.slice(0, 500),
        hasErrorDigest: body.includes('"E"') || body.includes("digest"),
      });
    } catch (error) {
      rscPayloads.push({ url: response.url(), error: String(error) });
    }
  }
});
page.on("requestfinished", (request) => {
  if (
    request.resourceType() === "document" ||
    request.headers()["rsc"] === "1"
  ) {
    navigationTrace.push({ event: "finished", url: request.url() });
  }
});

async function visibleFilmCount() {
  return page.locator('a[href^="/film/"]:visible').count();
}

async function waitForVisibleFilmCards(label, timeout = 12_000) {
  try {
    await page
      .locator('a[href^="/film/"]:visible')
      .first()
      .waitFor({ state: "visible", timeout });
  } catch (error) {
    const diagnostics = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a[href^="/film/"]')];
      const sample = links[0];
      const style = sample ? getComputedStyle(sample) : null;
      const rect = sample?.getBoundingClientRect();
      return {
        url: location.href,
        entrySplash: document.documentElement.dataset.entrySplash,
        totalFilmLinks: links.length,
        bodyText: document.body.innerText.slice(0, 500),
        sample: sample
          ? {
              display: style?.display,
              visibility: style?.visibility,
              opacity: style?.opacity,
              width: rect?.width,
              height: rect?.height,
            }
          : null,
      };
    });
    console.error(JSON.stringify({ label, diagnostics, pageErrors, consoleErrors }, null, 2));
    throw error;
  }
}

async function brokenFilmImages() {
  await page.waitForTimeout(2_500);
  return page.locator('a[href^="/film/"]:visible img').evaluateAll((images) =>
    images
      .filter(
        (image) =>
          image.complete &&
          image.naturalWidth === 0 &&
          Number.parseFloat(getComputedStyle(image).opacity || "1") > 0.05,
      )
      .map((image) => ({
        src: image.currentSrc || image.src,
        alt: image.alt,
        filmHref: image.closest('a')?.getAttribute('href') || null,
        opacity: getComputedStyle(image).opacity,
      })),
  );
}

const results = {};

await page.goto(`${baseURL}/films/series`, { waitUntil: "domcontentloaded" });
await waitForVisibleFilmCards("series-initial");
results.seriesCards = await visibleFilmCount();
results.seriesBrokenImages = await brokenFilmImages();

const paginationOrigin = await page.evaluate(() => performance.timeOrigin);
const nextPageButton = page.locator('button[aria-label="Trang tiếp"]:visible').first();
await nextPageButton.waitFor({ state: "visible", timeout: 8_000 });
await nextPageButton.click();
await page.waitForURL(/\/films\/series\?page=2$/, { timeout: 12_000 });
await waitForVisibleFilmCards("series-page-2");
results.paginationCards = await visibleFilmCount();
results.programmaticNavigation =
  paginationOrigin === (await page.evaluate(() => performance.timeOrigin))
    ? "next-client-transition"
    : "bounded-document-fallback";

await page.waitForTimeout(1_600);
const timeOriginBeforeNavigation = await page.evaluate(() => performance.timeOrigin);
const singleTab = page.locator('a[href="/films/single"]:visible').first();
const clickedHref = await singleTab.getAttribute("href");
await singleTab.click();
try {
  await page.waitForURL(/\/films\/single(?:\?|$)/, { timeout: 12_000 });
} catch (error) {
  console.error(
    JSON.stringify(
      {
        clickedHref,
        currentUrl: page.url(),
        navigationTrace,
        consoleErrors,
        failedResources,
        pageErrors,
        rscPayloads,
      },
      null,
      2,
    ),
  );
  throw error;
}
await waitForVisibleFilmCards("single");
results.singleCards = await visibleFilmCount();
results.singleBrokenImages = await brokenFilmImages();
results.clientNavigation =
  timeOriginBeforeNavigation ===
  (await page.evaluate(() => performance.timeOrigin));
results.navigationMode = results.clientNavigation
  ? "next-client-transition"
  : "bounded-document-fallback";

await page.goto(`${baseURL}/genres`, { waitUntil: "networkidle" });
await page.waitForFunction(
  () =>
    [...document.querySelectorAll("main img")].every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  undefined,
  { timeout: 10_000 },
);
results.genreImages = await page.locator("main img").count();
results.brokenGenreImages = await page.locator("main img").evaluateAll((images) =>
  images.filter((image) => !image.complete || image.naturalWidth === 0).length,
);

const heroStorageKey = "netphim.tmdb-hero.v10";
await page.goto(baseURL, { waitUntil: "domcontentloaded" });
await page.waitForFunction(
  (key) => {
    try {
      const playlist = JSON.parse(sessionStorage.getItem(key) || "null");
      return Array.isArray(playlist) && playlist.length === 6;
    } catch {
      return false;
    }
  },
  heroStorageKey,
  { timeout: 12_000 },
);
const firstPlaylist = await page.evaluate(
  (key) => JSON.parse(sessionStorage.getItem(key) || "[]").map((film) => film.slug),
  heroStorageKey,
);

await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForFunction(
  ({ key, previous }) => {
    try {
      const playlist = JSON.parse(sessionStorage.getItem(key) || "null");
      return (
        Array.isArray(playlist) &&
        playlist.length === 6 &&
        playlist.map((film) => film.slug).join("|") !== previous
      );
    } catch {
      return false;
    }
  },
  { key: heroStorageKey, previous: firstPlaylist.join("|") },
  { timeout: 12_000 },
);
const secondPlaylist = await page.evaluate(
  (key) => JSON.parse(sessionStorage.getItem(key) || "[]").map((film) => film.slug),
  heroStorageKey,
);
results.heroFirstPlaylist = firstPlaylist;
results.heroSecondPlaylist = secondPlaylist;
results.heroUniquePerPlaylist =
  new Set(firstPlaylist).size === 6 && new Set(secondPlaylist).size === 6;
results.heroImmediateRepeats = secondPlaylist.filter((slug) =>
  firstPlaylist.includes(slug),
).length;
results.consoleErrors = consoleErrors.filter(
  (message) =>
    !message.includes("favicon") &&
    !message.includes("ERR_BLOCKED_BY_CLIENT"),
);
results.failedResponses = failedResources
  .filter((resource) => resource.event === "response")
  .slice(0, 20);

const mobileContext = await browser.newContext({
  viewport: { width: 412, height: 915 },
  isMobile: true,
  hasTouch: true,
  serviceWorkers: "allow",
});
const mobilePage = await mobileContext.newPage();
await mobilePage.goto(`${baseURL}/films/series`, { waitUntil: "domcontentloaded" });
await mobilePage
  .locator('a[href^="/film/"]:visible')
  .first()
  .waitFor({ state: "visible", timeout: 8_000 });
const mobileOrigin = await mobilePage.evaluate(() => performance.timeOrigin);
await mobilePage.locator('a[href="/genres"]:visible').first().click();
await mobilePage.waitForURL(/\/genres(?:\?|$)/, { timeout: 12_000 });
await mobilePage.waitForFunction(
  () =>
    [...document.querySelectorAll("main img")].every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  undefined,
  { timeout: 10_000 },
);
results.mobileNavigation =
  mobileOrigin === (await mobilePage.evaluate(() => performance.timeOrigin))
    ? "next-client-transition"
    : "bounded-document-fallback";
results.mobileGenreImages = await mobilePage.locator("main img").count();
results.mobileBrokenGenreImages = await mobilePage
  .locator("main img")
  .evaluateAll((images) =>
    images.filter((image) => !image.complete || image.naturalWidth === 0).length,
  );
await mobileContext.close();

await browser.close();

const passed =
  results.seriesCards > 0 &&
  results.seriesBrokenImages.length === 0 &&
  results.paginationCards > 0 &&
  results.singleCards > 0 &&
  results.singleBrokenImages.length === 0 &&
  results.genreImages === 10 &&
  results.brokenGenreImages === 0 &&
  results.mobileGenreImages === 10 &&
  results.mobileBrokenGenreImages === 0 &&
  results.heroUniquePerPlaylist &&
  results.heroImmediateRepeats === 0;

console.log(JSON.stringify({ passed, ...results }, null, 2));
if (!passed) process.exitCode = 1;
