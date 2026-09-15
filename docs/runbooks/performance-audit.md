# FlexPhim production performance audit

## PostgreSQL query plans

Use a production-like data snapshot and a real user containing history:

```powershell
$env:DATABASE_URL = "postgresql://..."
$env:NETPHIM_EXPLAIN_USER_ID = "user-cuid"
$env:NETPHIM_EXPLAIN_QUERY = "bo gia"
pnpm db:explain
```

Save the four plans before and after migrations. Expected hot paths are index
scans on history/favorites and bounded aggregation work for the seven-day top
10. A tiny local database may legitimately choose a sequential scan.

## Repeatable 4G lab waterfall

Start the production build, then run:

```powershell
$env:PERF_BASE_URL = "https://staging.netphim.example"
$env:PERF_MOVIE_SLUG = "a-real-staging-slug"
pnpm perf:waterfall:4g
```

The JSON report is written to
`apps/web/artifacts/performance/waterfall-4g.json`. It lists the LCP element,
slowest and largest requests, duplicate request groups, and images that are
oversized for their rendered dimensions.

This is a lab profile, not a substitute for a physical-device pass. Before a
release, repeat home, detail, and watch flows on an Android device with cache
disabled and actual 4G, and attach a Chrome DevTools HAR. Compare its LCP
blocker and duplicate API list with the automated report.

## Meilisearch reconciliation

`GET /v1/search/status` reports indexed/deleted counts, failed writes, queue
drops (documents that still need indexing), queue depth, and the remote index
document count. Add/update is incremental whenever provider results flow
through the gateway. An authoritative delete job calls:

```http
POST /v1/search/documents/delete
X-Internal-Token: <MEDIA_INTERNAL_TOKEN>
Content-Type: application/json

{"canonicalKeys":["film:canonical-key"]}
```

Never infer deletes from a partial provider page. Only the authoritative movie
delete/sync workflow should send tombstones.
