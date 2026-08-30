FROM rust:1.88-bookworm AS builder

WORKDIR /build
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --locked --release

FROM debian:bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --create-home netphim

COPY --from=builder /build/target/release/netphim-media-worker /usr/local/bin/netphim-media-worker

USER netphim
EXPOSE 8091

ENTRYPOINT ["/usr/local/bin/netphim-media-worker"]
