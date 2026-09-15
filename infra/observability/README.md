# FlexPhim media observability

`prometheus/media-alerts.yml` contains production alert rules for the Gin media
gateway and Rust HLS analyzer. Load it from the Prometheus instance used by the
VPS or cluster. The default Compose profile intentionally does not start
Prometheus or Grafana, so local development keeps its current RAM footprint.

Scrape only on the internal network:

- `media-gateway:8081/metrics` with `X-Media-Internal-Token`.
- `media-worker-rs:8091/metrics`.

The minimum dashboard should graph gateway request and upstream p95, cache hit
ratio, retries/timeouts, active streams, analyzer duration, pending/reclaimed
jobs, dead-letter jobs and Redis errors.
