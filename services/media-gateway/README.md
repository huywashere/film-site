# NetPhim Media Gateway

Gin service dedicated to HLS manifests, segments and encryption keys. It keeps
the existing `/api/hls-proxy` signature contract, so the web player does not
need a second source format.

## Local verification

```bash
go test ./...
go vet ./...
docker build -t netphim-media-gateway ./services/media-gateway
```

Integration tests cover concurrent manifest cache misses, byte range forwarding,
bounded retries, manifest size limits, and Prometheus latency/provider metrics.

Run the k6 profile against the internal gateway (or provide a pre-signed public
proxy URL):

```bash
k6 run \
  -e MEDIA_BASE_URL=http://media-gateway:8081 \
  -e MEDIA_TEST_TARGET_URL=https://provider.example/movie/master.m3u8 \
  -e MEDIA_INTERNAL_TOKEN="$MEDIA_INTERNAL_TOKEN" \
  tests/k6/hls-proxy.js
```

P1/P2 catalog, bootstrap, search and Top 10:

```bash
k6 run -e BASE_URL=http://127.0.0.1:8081 \
  -e MOVIE_SLUG=oppenheimer tests/k6/catalog.js
```

## Movie read APIs (P1/P2)

- `GET /v1/movies/:slug/bootstrap`: merged movie detail, episode servers,
  source-specific slugs and provider payloads in one request.
- `GET /v1/catalog?kind=...`: cached, deduplicated multi-source catalogue.
- `GET /v1/search?q=...`: multi-source search with deterministic ranking.
- `GET /v1/top10`: real view analytics from NestJS with catalogue fallback.
- `GET /v1/catalog/providers/health`: provider circuit state and latency.

The Next.js `/api/catalog-gateway/*` route is a compatibility bridge. Browser
requests prefer Gin while retaining the established provider logic as a
fallback, so a gateway outage does not take film pages offline.

The production Compose stack exposes the service only on the internal Docker
network. Nginx sends a stable 10% canary to Gin and transparently retries the
existing Next.js route handler on 502/503/504.

## Required production secrets

- `HLS_PROXY_SECRET`: exactly the same value used by the Next.js web service.
- `MEDIA_INTERNAL_TOKEN`: an independent random value of at least 32 characters.
- `HLS_PROXY_ALLOWED_HOSTS`: comma-separated media CDN allowlist.

Generate secrets in the deployment secret store, never in the repository.

## Production hardening

- `MEDIA_RETRY_ATTEMPTS` is bounded to `1..3` (default `2`). Only network
  failures and transient `408/425/500/502/503/504` responses are retried.
- `MEDIA_MAX_MANIFEST_BYTES` and `MEDIA_MAX_RESOLVE_BYTES` bound buffered input.
- `MEDIA_SERVER_*_TIMEOUT` values protect the public HTTP server. Keep
  `MEDIA_SERVER_WRITE_TIMEOUT` long enough for the largest expected segment.
- `MEDIA_SHUTDOWN_TIMEOUT` defaults to `25s`; Compose grants `35s` so in-flight
  segments can drain before the container is killed.
- `MEDIA_TRUSTED_PROXIES` must contain only OpenResty/Docker network ranges.
- Manifest cache misses are coalesced per URL so one upstream request serves
  concurrent viewers.

## Rollout

1. Deploy at `10%` and monitor `/metrics` plus `/v1/providers/health` internally.
   Track request/upstream p95, retry/timeout counts, cache hit ratio, active
   streams, and errors per provider.
2. Change the `split_clients` percentage in `nginx.conf` to `30%`, `70%`, then
   `100%` only when buffering and upstream error rates stay healthy.
3. Keep `@hls_next_proxy` until the gateway has completed a full provider cycle.

The internal endpoints require `X-Media-Internal-Token`. Do not expose port
`8081` directly to the internet; publish only the Nginx/Cloudflare hostname.
