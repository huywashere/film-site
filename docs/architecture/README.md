# NetPhim system architecture

## Service boundaries

NetPhim is a polyglot monorepo. Each runtime has one explicit responsibility:

| Component                  | Runtime      | Responsibility                                                     |
| -------------------------- | ------------ | ------------------------------------------------------------------ |
| `apps/web`                 | Next.js      | Public UI, SSR, BFF routes and playback experience                 |
| `apps/admin`               | Next.js      | Private control room and operational workflows                     |
| `apps/api`                 | NestJS       | Identity, authorization, user data, CMS and transactional writes   |
| `services/media-gateway`   | Go/Gin       | Multi-source catalog, HLS gateway and provider resilience          |
| `services/media-worker-rs` | Rust/Tokio   | Asynchronous HLS validation and playback-quality metadata          |
| `packages/shared-types`    | TypeScript   | Compile-time contracts shared by web, API and admin                |
| Meilisearch                | Rust service | Derived movie search index with provider fallback                  |
| PostgreSQL                 | Database     | Source of truth for transactional application data                 |
| Redis                      | Cache/queue  | Cache, rate limits, Socket.IO adapter and distributed coordination |
| OpenResty                  | Edge         | TLS termination, reverse proxy, cache policy and WAF rules         |

## Request flow

```text
Browser
  -> Cloudflare
  -> OpenResty
       -> Next.js web/admin
       -> NestJS core API
       -> Go media gateway
            -> Redis cache
            -> Meilisearch
            -> movie providers
            -> Redis Stream -> Rust HLS analyzer -> analysis cache/results
```

The core API owns authentication and writes. The media gateway owns external
movie-provider reads and playback routing. Do not duplicate these responsibilities
inside page components or introduce direct browser calls to upstream providers.
The Rust analyzer is deliberately asynchronous: a slow or failed analysis must never
delay manifest delivery or become required for playback correctness.

## Data ownership

- PostgreSQL is authoritative for users, sessions, configuration, reviews and history.
- Redis data is disposable unless a feature explicitly documents otherwise.
- Meilisearch is a rebuildable index, never the source of truth.
- Provider fixtures belong to `apps/api/test/fixtures/providers`.
- Browser assets belong to the application that serves them (`apps/web/public`).

## Shared contracts

`@netphim/shared-types` contains transport-neutral TypeScript contracts. It must not
import NestJS, React, Prisma or browser-only modules. Runtime validation remains at
the service boundary; shared TypeScript types alone are not input validation.

## Architecture rules

1. Public services communicate through documented HTTP or queue contracts.
2. Every upstream request has a timeout, bounded retry and circuit breaker.
3. A cache miss must not make correctness depend on Redis availability.
4. Search and catalog deduplication retain source alternatives for playback fallback.
5. Secrets live in environment/secret stores and never in committed manifests.
6. Infrastructure changes require `docker compose config`, Terraform validation and
   the relevant application build before deployment.

Record significant future decisions as short ADR files in this directory.
