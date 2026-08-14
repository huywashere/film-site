# ══════════════════════════════════════════════════════
# CineVerse — Production Dockerfile (pnpm monorepo)
# ══════════════════════════════════════════════════════

ARG NODE_VERSION=20
ARG PNPM_VERSION=9.5.0

# ── Base image with pnpm ──────────────────────────────
FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
RUN apk add --no-cache openssl && \
    corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# ── Stage 1: Install all dependencies ─────────────────
FROM base AS deps
WORKDIR /app

# Copy workspace config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install all deps (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build API ─────────────────────────────────
# Inherit the deps filesystem directly. Copying pnpm's workspace node_modules
# between stages dereferences/breaks its relative symlinks (notably Prisma).
FROM deps AS api-builder
WORKDIR /app

COPY apps/api ./apps/api

# Use the root pnpm bin links. Workspace-local links may be replaced when the
# Windows build context is overlaid in Docker, while the root store is stable.
RUN /app/node_modules/.bin/prisma generate --schema=apps/api/prisma/schema.prisma && \
    cd apps/api && /app/node_modules/.bin/nest build

# Create a self-contained production package. This preserves pnpm's generated
# Prisma client without carrying the entire monorepo/dev dependency tree.
RUN pnpm --filter api deploy --prod /prod/api && \
    cp -R apps/api/dist /prod/api/dist && \
    cd /prod/api && /app/node_modules/.bin/prisma generate --schema=prisma/schema.prisma

# ── Stage 3: Build Web ─────────────────────────────────
FROM deps AS web-builder
WORKDIR /app

COPY apps/web ./apps/web

# Build args for Next.js (baked at build time — ONLY NEXT_PUBLIC_* vars)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_NAME=NetPhim
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
# FIX #8: TMDB_API_KEY & TMDB_ACCESS_TOKEN are server-side secrets.
# Removed from build args to avoid baking them into image layers (docker history).
# Pass them at runtime via docker-compose environment section.
ARG KKPHIM_API_BASE=https://phimapi.com
ARG OPHIM_API_BASE=https://ophim1.com
ARG NGUONC_API_BASE=https://phim.nguonc.com/api
ARG VSMOV_API_BASE=https://vsmov.com/api

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV KKPHIM_API_BASE=$KKPHIM_API_BASE
ENV OPHIM_API_BASE=$OPHIM_API_BASE
ENV NGUONC_API_BASE=$NGUONC_API_BASE
ENV VSMOV_API_BASE=$VSMOV_API_BASE
ENV NEXT_TELEMETRY_DISABLED=1

RUN cd apps/web && \
    /app/node_modules/.bin/next build && \
    node scripts/check-performance-budget.mjs

# ── Stage 4: API Production Runtime ───────────────────
FROM node:${NODE_VERSION}-alpine AS api
RUN apk add --no-cache openssl

ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy the portable production package built by pnpm deploy.
COPY --from=api-builder --chown=nestjs:nodejs /prod/api ./apps/api

USER nestjs
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]

# ── Stage 5: Web Production Runtime ───────────────────
FROM node:${NODE_VERSION}-alpine AS web

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built Next.js standalone app
COPY --from=web-builder /app/apps/web/public ./apps/web/public
COPY --from=web-builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=web-builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/web/server.js"]
