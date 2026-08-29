import http from "k6/http";
import { check } from "k6";

const baseUrl = __ENV.BASE_URL || "http://127.0.0.1:8081";
const slug = __ENV.MOVIE_SLUG || "oppenheimer";

export const options = {
  scenarios: {
    catalog_reads: {
      executor: "constant-arrival-rate",
      rate: Number(__ENV.RATE || 60),
      timeUnit: "1s",
      duration: __ENV.DURATION || "60s",
      preAllocatedVUs: 20,
      maxVUs: 120,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<350", "p(99)<900"],
    checks: ["rate>0.99"],
  },
};

const routes = [
  `/v1/movies/${encodeURIComponent(slug)}/bootstrap`,
  "/v1/catalog?kind=latest&page=1&limit=24",
  "/v1/catalog?kind=series&page=1&limit=24",
  "/v1/search?q=oppenheimer&page=1&limit=12",
  "/v1/top10?limit=10",
];

export default function () {
  const route = routes[Math.floor(Math.random() * routes.length)];
  const response = http.get(`${baseUrl}${route}`, {
    tags: { endpoint: route.split("?")[0] },
  });
  check(response, {
    "status is 200": (result) => result.status === 200,
    "response is JSON": (result) =>
      String(result.headers["Content-Type"] || "").includes("application/json"),
    "catalog cache is reported": (result) =>
      Boolean(result.headers["X-Netphim-Catalog-Cache"]),
  });
}
