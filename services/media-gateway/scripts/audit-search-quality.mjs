#!/usr/bin/env node

const baseUrl = (process.env.SEARCH_BASE_URL || "http://127.0.0.1:8081").replace(/\/$/, "");
const requireEngine = process.env.REQUIRE_ENGINE || (process.env.REQUIRE_TYPESENSE === "1" ? "typesense" : (process.env.REQUIRE_MEILI === "1" ? "meilisearch" : ""));
const p50Budget = Number(process.env.SEARCH_P50_BUDGET_MS || 100);
const p95Budget = Number(process.env.SEARCH_P95_BUDGET_MS || 250);

const cases = [
  ["avengers", ["avengers", "biet doi sieu anh hung"]],
  ["người nhện", ["spider man", "nguoi nhen"]],
  ["spiderman", ["spider man", "nguoi nhen"]],
  ["thám tử lừng danh conan", ["detective conan", "tham tu lung danh conan"]],
  ["doraemon", ["doraemon"]],
  ["bố già", ["bo gia", "the godfather", "dad i m sorry"]],
  ["hố đen tử thần", ["interstellar", "ho den tu than"]],
  ["kẻ cắp giấc mơ", ["inception", "ke cap giac mo"]],
  ["hành tinh cát", ["dune", "hanh tinh cat"]],
  ["phi vụ triệu đô", ["money heist", "la casa de papel", "phi vu trieu do"]],
  ["squid game", ["squid game", "tro choi con muc"]],
  ["onepiece", ["one piece", "dao hai tac", "vua hai tac"]],
];

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function percentile(values, value) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * value) - 1)] || 0;
}

function canonical(item) {
  return item?._canonicalKey ||
    (item?.tmdb?.id ? `tmdb:${item.tmdb.type || "movie"}:${item.tmdb.id}` : "") ||
    (item?.imdb?.id ? `imdb:${item.imdb.id}` : "") ||
    `${normalize(item?.type)}:${normalize(item?.origin_name || item?.name)}:${item?.year || ""}`;
}

const failures = [];
const latencies = [];
const engines = new Set();

for (const [query, expected] of cases) {
  // Warm the query cache before measuring user-visible repeat latency.
  await fetch(`${baseUrl}/v1/search?q=${encodeURIComponent(query)}&page=1&limit=24`);
  const started = performance.now();
  const response = await fetch(`${baseUrl}/v1/search?q=${encodeURIComponent(query)}&page=1&limit=24`);
  latencies.push(performance.now() - started);
  if (!response.ok) {
    failures.push(`${query}: HTTP ${response.status}`);
    continue;
  }
  const payload = await response.json();
  engines.add(payload._engine || "unknown");
  const items = payload?.data?.items || [];
  if (items.length === 0) {
    failures.push(`${query}: empty result`);
    continue;
  }
  const keys = items.map(canonical);
  if (new Set(keys).size !== keys.length) failures.push(`${query}: duplicate canonical cards`);

  const topThree = items
    .slice(0, 3)
    .map((item) => normalize(`${item.name || ""} ${item.origin_name || ""}`));
  const matched = topThree.some((title) => expected.some((alias) => title.includes(normalize(alias))));
  if (!matched) failures.push(`${query}: expected title not found in top 3 (${topThree.join(" | ")})`);
}

const p50 = percentile(latencies, 0.5);
const p95 = percentile(latencies, 0.95);
if (p50 > p50Budget) failures.push(`p50 ${p50.toFixed(1)}ms exceeds ${p50Budget}ms`);
if (p95 > p95Budget) failures.push(`p95 ${p95.toFixed(1)}ms exceeds ${p95Budget}ms`);
if (requireEngine && (engines.size !== 1 || !engines.has(requireEngine))) {
  failures.push(`expected only ${requireEngine}, observed: ${[...engines].join(", ")}`);
}

console.log(JSON.stringify({
  baseUrl,
  cases: cases.length,
  engines: [...engines],
  p50Ms: Number(p50.toFixed(1)),
  p95Ms: Number(p95.toFixed(1)),
  failures,
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
