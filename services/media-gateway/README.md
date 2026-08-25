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

The production Compose stack exposes the service only on the internal Docker
network. Nginx sends a stable 10% canary to Gin and transparently retries the
existing Next.js route handler on 502/503/504.

## Required production secrets

- `HLS_PROXY_SECRET`: exactly the same value used by the Next.js web service.
- `MEDIA_INTERNAL_TOKEN`: an independent random value of at least 32 characters.
- `HLS_PROXY_ALLOWED_HOSTS`: comma-separated media CDN allowlist.

Generate secrets in the deployment secret store, never in the repository.

## Rollout

1. Deploy at `10%` and monitor `/metrics` plus `/v1/providers/health` internally.
2. Change the `split_clients` percentage in `nginx.conf` to `30%`, `70%`, then
   `100%` only when buffering and upstream error rates stay healthy.
3. Keep `@hls_next_proxy` until the gateway has completed a full provider cycle.

The internal endpoints require `X-Media-Internal-Token`. Do not expose port
`8081` directly to the internet; publish only the Nginx/Cloudflare hostname.
