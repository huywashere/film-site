import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import * as cookieParser from "cookie-parser";
import * as Sentry from "@sentry/node";
import { AppModule } from "./app.module";

// ── Sentry – init BEFORE creating the NestJS app so all errors are captured
// If SENTRY_DSN is not set, Sentry runs as a no-op (zero overhead)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    // Capture 10% of transactions for performance monitoring (cost-effective)
    tracesSampleRate: 0.1,
    // Don't send errors in test environment
    enabled: process.env.NODE_ENV !== "test",
  });
  console.log("🔍 Sentry error tracking enabled");
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ── Proxy trust ───────────────────────────────────────────────
  // Railway/Vercel/nginx terminate TLS and forward the real client IP in
  // X-Forwarded-For. Without this, req.ip is always the proxy address, so every
  // visitor shares one rate-limit bucket and @Ip() logs a useless value.
  // Count the hops your platform actually adds — do NOT use `true`, which
  // trusts the left-most (client-supplied, spoofable) XFF entry.
  const trustedProxyHops = Number(process.env.TRUSTED_PROXY_HOPS ?? 1);
  app.set("trust proxy", Number.isFinite(trustedProxyHops) ? trustedProxyHops : 1);

  // ── Security headers (Helmet) ──────────────────────────────────
  // Protects against well-known web vulnerabilities by setting HTTP headers
  app.use(cookieParser());
  app.use(
    helmet({
      // Allow same-origin iframes (used by our own video player)
      frameguard: { action: "sameorigin" },
      // This is a JSON API: no HTML is served, so lock scripting down entirely
      // rather than disabling CSP. The Next.js frontend sets its own policy.
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          "default-src": ["'none'"],
          "frame-ancestors": ["'none'"],
          "base-uri": ["'none'"],
          "form-action": ["'none'"],
        },
      },
      // Don't leak API URLs to third parties via the Referer header.
      referrerPolicy: { policy: "no-referrer" },
      crossOriginResourcePolicy: { policy: "same-site" },
      hsts: {
        maxAge: 31_536_000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // ── Global prefix ─────────────────────────────────────────────
  app.setGlobalPrefix("api/v1");

  // ── CORS – restrict to trusted frontend origins ───────────────
  const origins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",")
        .map((o) => o.trim())
        .filter(Boolean)
    : ["http://localhost:3000"];

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  });

  // ── Request body size cap ─────────────────────────────────────
  // Default 100kb is plenty for this API's JSON payloads and keeps oversized
  // bodies from being parsed at all.
  const { json, urlencoded } = await import("express");
  app.use(json({ limit: "100kb" }));
  app.use(urlencoded({ extended: true, limit: "100kb" }));

  // ── Global input validation ───────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown fields silently
      transform: true, // auto-cast @Query() params to correct types
      forbidNonWhitelisted: true, // reject requests with unknown fields (400)
    }),
  );

  // Rate limiting is wired as an APP_GUARD in AppModule so it receives the
  // Redis-backed storage through DI.

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🎬 CineVerse API running on: http://localhost:${port}/api/v1`);
}

bootstrap();
