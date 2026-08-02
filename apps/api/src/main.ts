import { NestFactory } from "@nestjs/core";
import { ValidationPipe, ConsoleLogger } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import * as cookieParser from "cookie-parser";
import * as Sentry from "@sentry/node";
import { AppModule } from "./app.module";

// ── Clean & Pretty Console Logger (Suppresses RouterExplorer route mapping spam) ──
class CleanLogger extends ConsoleLogger {
  log(message: any, context?: string) {
    // Filter out verbose 30+ line route mapping noise on startup
    if (context === "RouterExplorer" || context === "RoutesResolver") return;
    super.log(message, context);
  }
}

// ── Sentry – init BEFORE creating the NestJS app so all errors are captured
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV !== "test",
  });
  console.log("🔍 Sentry error tracking enabled");
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new CleanLogger("CineVerse"),
  });

  // ── Proxy trust ───────────────────────────────────────────────
  const trustedProxyHops = Number(process.env.TRUSTED_PROXY_HOPS ?? 1);
  app.set(
    "trust proxy",
    Number.isFinite(trustedProxyHops) ? trustedProxyHops : 1,
  );

  // ── Security headers (Helmet) ──────────────────────────────────
  app.use(cookieParser());
  app.use(
    helmet({
      frameguard: { action: "sameorigin" },
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          "default-src": ["'none'"],
          "frame-ancestors": ["'none'"],
          "base-uri": ["'none'"],
          "form-action": ["'none'"],
        },
      },
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
  const configuredOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",")
        .map((o) => o.trim())
        .filter(Boolean)
    : ["http://localhost:3000"];
  const origins = Array.from(
    new Set(
      process.env.NODE_ENV === "production"
        ? configuredOrigins
        : [...configuredOrigins, "http://127.0.0.1:3000"],
    ),
  );

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  });

  // ── Request body size cap ─────────────────────────────────────
  const { json, urlencoded } = await import("express");
  app.use(json({ limit: "100kb" }));
  app.use(urlencoded({ extended: true, limit: "100kb" }));

  // ── Global input validation ───────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🎬 CineVerse API running on: http://localhost:${port}/api/v1`);
}

bootstrap();
