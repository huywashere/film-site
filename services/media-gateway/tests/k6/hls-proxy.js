import http from "k6/http";
import { check, fail } from "k6";

export const options = {
  scenarios: {
    manifest_cache: {
      executor: "constant-arrival-rate",
      rate: Number(__ENV.MEDIA_TEST_RATE || 40),
      timeUnit: "1s",
      duration: __ENV.MEDIA_TEST_DURATION || "60s",
      preAllocatedVUs: Number(__ENV.MEDIA_TEST_VUS || 20),
      maxVUs: Number(__ENV.MEDIA_TEST_MAX_VUS || 100),
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500", "p(99)<1500"],
    checks: ["rate>0.99"],
  },
};

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

export function setup() {
  const baseURL = trimTrailingSlash(__ENV.MEDIA_BASE_URL);
  const providedURL = String(__ENV.MEDIA_TEST_SIGNED_URL || "").trim();
  if (providedURL) {
    return {
      url: providedURL.startsWith("http")
        ? providedURL
        : `${baseURL}${providedURL}`,
    };
  }

  const targetURL = String(__ENV.MEDIA_TEST_TARGET_URL || "").trim();
  const internalToken = String(__ENV.MEDIA_INTERNAL_TOKEN || "").trim();
  if (!baseURL || !targetURL || !internalToken) {
    fail(
      "Set MEDIA_TEST_SIGNED_URL, or set MEDIA_BASE_URL + MEDIA_TEST_TARGET_URL + MEDIA_INTERNAL_TOKEN",
    );
  }

  const response = http.post(
    `${baseURL}/v1/streams/resolve`,
    JSON.stringify({ url: targetURL }),
    {
      headers: {
        "Content-Type": "application/json",
        "X-Media-Internal-Token": internalToken,
      },
    },
  );
  check(response, { "stream resolved": (result) => result.status === 200 });
  if (response.status !== 200) {
    fail(`Unable to resolve stream: HTTP ${response.status}`);
  }
  const proxyURL = response.json("proxyUrl");
  return {
    url: proxyURL.startsWith("http") ? proxyURL : `${baseURL}${proxyURL}`,
  };
}

export default function (data) {
  const response = http.get(data.url, {
    headers: { Accept: "application/vnd.apple.mpegurl" },
    tags: { endpoint: "hls-manifest" },
  });
  check(response, {
    "manifest status is 200": (result) => result.status === 200,
    "manifest starts with EXTM3U": (result) =>
      result.body.startsWith("#EXTM3U"),
    "cache header is present": (result) =>
      Boolean(
        result.headers["X-Netphim-Manifest-Cache"] ||
        result.headers["X-NetPhim-Manifest-Cache"],
      ),
  });
}
