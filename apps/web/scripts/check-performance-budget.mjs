import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const reportPath = resolve(
  process.cwd(),
  ".next/diagnostics/route-bundle-stats.json",
);
const routes = JSON.parse(await readFile(reportPath, "utf8"));

// Turbopack reports uncompressed first-load JavaScript. These limits include a
// little release-to-release headroom while still catching accidental imports
// of large player/auth libraries into the critical route graph.
const defaultBudget = 1_400 * 1024;
const routeBudgets = new Map([
  ["/", 1_450 * 1024],
  ["/genres", 1_350 * 1024],
  ["/genre/[slug]", 1_450 * 1024],
  ["/country/[slug]", 1_400 * 1024],
  ["/watch/[slug]", 1_450 * 1024],
  ["/film/[slug]", 1_500 * 1024],
  ["/universe/[slug]", 1_600 * 1024],
  ["/login", 1_300 * 1024],
  ["/register", 1_300 * 1024],
]);

const failures = routes.filter(({ route, firstLoadUncompressedJsBytes }) => {
  const budget = routeBudgets.get(route) ?? defaultBudget;
  return firstLoadUncompressedJsBytes > budget;
});

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const largest = [...routes]
  .sort(
    (left, right) =>
      right.firstLoadUncompressedJsBytes - left.firstLoadUncompressedJsBytes,
  )
  .slice(0, 5);

console.log("Largest first-load JS routes:");
for (const entry of largest) {
  console.log(`  ${entry.route}: ${kb(entry.firstLoadUncompressedJsBytes)}`);
}

if (failures.length > 0) {
  console.error("\nPerformance budget exceeded:");
  for (const entry of failures) {
    const budget = routeBudgets.get(entry.route) ?? defaultBudget;
    console.error(
      `  ${entry.route}: ${kb(entry.firstLoadUncompressedJsBytes)} > ${kb(budget)}`,
    );
  }
  process.exitCode = 1;
} else {
  console.log("Performance budgets passed.");
}
