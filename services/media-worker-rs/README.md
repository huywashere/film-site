# NetPhim Rust HLS Analyzer

Internal asynchronous worker for inspecting HLS playlists without adding work
to the viewer request path. The Go media gateway publishes a job after a new
manifest is fetched. This worker validates the manifest, samples segments,
records explicit ad/intro markers, calculates duration and stores a health
score in Redis.

The worker never removes media segments and never decides playback position.
Its result is advisory metadata for source ranking and player markers.

## Redis contract

- Jobs stream: `netphim:hls:analysis:jobs`
- Consumer group: `hls-analyzers`
- Results stream: `netphim:hls:analysis:results`
- Dead-letter stream: `netphim:hls:analysis:dead-letter`
- Cached result: `netphim:hls:analysis:v1:<sha256-url>` (TTL 6 hours)

Every stream entry has one `payload` field containing JSON:

```json
{
  "jobId": "sha256 identifier",
  "url": "https://trusted-provider.example/movie/index.m3u8",
  "provider": "kkphim",
  "movieSlug": "optional-slug",
  "episode": "optional-episode",
  "requestedAt": 1788067200
}
```

## Safety and resource limits

- HTTPS and explicit provider allowlist in production.
- Maximum 2 MiB manifest by default.
- Eight-second end-to-end request timeout.
- Three sampled media segments, never the entire video.
- Two consumers by default, capped at eight.
- Redis Streams preserve unacknowledged jobs during restarts.
- `XAUTOCLAIM` reassigns jobs left pending by crashed/replaced consumers after
  `HLS_ANALYZER_RECLAIM_IDLE_MS` (60 seconds by default).
- Retry is limited to transient network/HTTP failures and uses exponential
  backoff with deterministic jitter; permanent 4xx/invalid manifests fail fast.
- Internal health/metrics server on port `8091`; no host port is published in
  production.

The Go gateway adds `schemaVersion` and `traceId` to every queued job. Rust
preserves that ID in structured logs and result payloads so one playback request
can be followed across services without logging signed media URLs.

## Shared contract

The language-neutral schemas and compatibility fixtures live in
`packages/shared-types/contracts`. Go tests, Rust tests and CI all decode the
same fixtures; change the schema version before making a breaking payload change.

## Local development

Rust does not need to be installed on the host:

```powershell
docker compose --project-directory . -f infra/docker/docker-compose.dev.yml --profile media-analysis up --build
```

Publish a manual job:

```text
XADD netphim:hls:analysis:jobs * payload '{"jobId":"test-1","url":"https://.../index.m3u8","provider":"manual"}'
```

Inspect the result:

```text
XRANGE netphim:hls:analysis:results - + COUNT 1
```
