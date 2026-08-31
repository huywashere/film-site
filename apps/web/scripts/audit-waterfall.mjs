import { chromium, devices } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.PERF_BASE_URL || "http://127.0.0.1:3000";
const slug = process.env.PERF_MOVIE_SLUG || "oppenheimer";
const routes = (process.env.PERF_ROUTES || `/,/film/${slug},/watch/${slug}`)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const output = path.resolve(
  process.cwd(),
  process.env.PERF_OUTPUT || "artifacts/performance/waterfall-4g.json",
);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...devices["Pixel 7"],
  serviceWorkers: "block",
});
const report = {
  generatedAt: new Date().toISOString(),
  baseURL,
  profile: {
    device: "Pixel 7",
    network: "Fast 4G (1.6 Mbps down, 750 Kbps up, 150 ms RTT)",
    cpuSlowdownMultiplier: 4,
    note: "Lab emulation. Validate the same routes on a physical 4G device before release.",
  },
  pages: [],
};

for (const route of routes) {
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__netphimVitals = { lcp: null, cls: 0 };
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries.at(-1);
      if (last) {
        window.__netphimVitals.lcp = {
          startTime: Math.round(last.startTime),
          size: last.size,
          url: last.url || null,
          tagName: last.element?.tagName || null,
        };
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__netphimVitals.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
    connectionType: "cellular4g",
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  const responses = new Map();
  page.on("response", async (response) => {
    const request = response.request();
    const headers = await response.allHeaders().catch(() => ({}));
    responses.set(request.url(), {
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      status: response.status(),
      contentType: headers["content-type"] || "",
      cache: headers["x-vercel-cache"] || headers["cf-cache-status"] || "",
      serverTiming: headers["server-timing"] || "",
    });
  });

  const target = new URL(route, baseURL).toString();
  const startedAt = Date.now();
  let navigationError = null;
  try {
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(8_000);
  } catch (error) {
    navigationError = error instanceof Error ? error.message : String(error);
  }

  const measurements = await page
    .evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0];
      const resources = performance.getEntriesByType("resource").map((entry) => ({
        url: entry.name,
        initiatorType: entry.initiatorType,
        duration: Math.round(entry.duration),
        transferSize: entry.transferSize || 0,
        encodedBodySize: entry.encodedBodySize || 0,
        decodedBodySize: entry.decodedBodySize || 0,
        startTime: Math.round(entry.startTime),
        responseEnd: Math.round(entry.responseEnd),
      }));
      const images = [...document.images].map((image) => ({
        url: image.currentSrc || image.src,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        renderedWidth: Math.round(image.getBoundingClientRect().width),
        renderedHeight: Math.round(image.getBoundingClientRect().height),
        loading: image.loading,
        fetchPriority: image.fetchPriority,
      }));
      return {
        vitals: window.__netphimVitals,
        navigation: navigation
          ? {
              ttfb: Math.round(navigation.responseStart),
              domContentLoaded: Math.round(navigation.domContentLoadedEventEnd),
              load: Math.round(navigation.loadEventEnd),
              transferSize: navigation.transferSize || 0,
            }
          : null,
        resources,
        images,
      };
    })
    .catch(() => ({ vitals: {}, navigation: null, resources: [], images: [] }));

  const requestRows = measurements.resources.map((resource) => ({
    ...resource,
    ...(responses.get(resource.url) || {}),
  }));
  const duplicateGroups = Object.entries(
    requestRows.reduce((groups, item) => {
      const key = item.url.replace(/([?&])_rsc=[^&]+/, "$1_rsc=*");
      groups[key] = (groups[key] || 0) + 1;
      return groups;
    }, {}),
  )
    .filter(([, count]) => count > 1)
    .map(([url, count]) => ({ url, count }))
    .sort((a, b) => b.count - a.count);
  const oversizedImages = measurements.images
    .map((image) => {
      const resource = requestRows.find((item) => item.url === image.url);
      return { ...image, transferSize: resource?.transferSize || 0 };
    })
    .filter(
      (image) =>
        image.transferSize > 250_000 ||
        (image.renderedWidth > 0 && image.naturalWidth > image.renderedWidth * 2.5),
    )
    .sort((a, b) => b.transferSize - a.transferSize);
  const slowest = [...requestRows]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 15);
  const largest = [...requestRows]
    .sort((a, b) => b.transferSize - a.transferSize)
    .slice(0, 15);

  report.pages.push({
    route,
    target,
    elapsedMs: Date.now() - startedAt,
    navigationError,
    navigation: measurements.navigation,
    vitals: measurements.vitals,
    requestCount: requestRows.length,
    transferredBytes: requestRows.reduce((sum, item) => sum + item.transferSize, 0),
    duplicateRequests: duplicateGroups,
    oversizedImages,
    slowestRequests: slowest,
    largestRequests: largest,
    requests: requestRows,
  });
  await page.close();
}

await browser.close();
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");

for (const page of report.pages) {
  const mb = (page.transferredBytes / 1024 / 1024).toFixed(2);
  console.log(
    `${page.route}: LCP=${page.vitals?.lcp?.startTime ?? "n/a"}ms, TTFB=${page.navigation?.ttfb ?? "n/a"}ms, requests=${page.requestCount}, transfer=${mb}MB, duplicateGroups=${page.duplicateRequests.length}, oversizedImages=${page.oversizedImages.length}`,
  );
}
console.log(`Waterfall report: ${output}`);
