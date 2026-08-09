import { NestFactory } from "@nestjs/core";
import { ValidationPipe, ConsoleLogger } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import * as cookieParser from "cookie-parser";
import * as Sentry from "@sentry/node";
import rateLimit from "express-rate-limit";
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

  // ── Security middleware ───────────────────────────────────────
  const exposeServerIdentity = process.env.EXPOSE_SERVER_IDENTITY === "true";

  if (!exposeServerIdentity) {
    app.disable("x-powered-by");
  }

  if (exposeServerIdentity) {
    app.use((req, res, next) => {
      res.setHeader("X-Powered-By", "Express");
      res.setHeader("Server", "Express");
      next();
    });
  }

  app.use(cookieParser());
  app.use((req, res, next) => {
    const isPublicMovieRead =
      req.method === "GET" &&
      req.path.startsWith("/api/v1/movies/") &&
      !req.path.startsWith("/api/v1/movies/stream-token/");

    if (isPublicMovieRead) {
      res.setHeader(
        "Cache-Control",
        "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      );
      res.setHeader("Vary", "Origin, Accept-Encoding");
    } else {
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private",
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
    next();
  });
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
        : [...configuredOrigins, "http://127.0.0.1:3000", "http://localhost:3000"],
    ),
  );

  // Cookie-authenticated unsafe requests must originate from a trusted web
  // application. CORS alone does not stop form-based CSRF requests.
  app.use((req, res, next) => {
    const unsafeMethod = !["GET", "HEAD", "OPTIONS"].includes(req.method);
    const hasSessionCookie = Boolean(
      req.cookies?.accessToken || req.cookies?.refreshToken,
    );
    const hasBearerToken = /^Bearer\s+\S+/i.test(
      String(req.headers.authorization || ""),
    );
    if (!unsafeMethod || !hasSessionCookie || hasBearerToken) {
      next();
      return;
    }

    const origin = String(req.headers.origin || "");
    const requestOrigin = `${req.protocol}://${req.get("host")}`;
    if (origin && (origins.includes(origin) || origin === requestOrigin)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: "Nguồn yêu cầu không được phép",
    });
  });

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (origins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 600,
  });

  // ── Global prefix ─────────────────────────────────────────────
  app.setGlobalPrefix("api/v1");

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Quá nhiều yêu cầu, vui lòng thử lại sau" },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Quá nhiều lần thử đăng nhập, vui lòng thử lại sau" },
  });

  const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Quá nhiều yêu cầu khôi phục mật khẩu, vui lòng thử lại sau 15 phút" },
  });

  const searchLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Bạn thực hiện tìm kiếm quá nhanh, vui lòng thử lại sau 1 phút" },
  });

  const reviewLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Bạn gửi bình luận quá nhanh, vui lòng chờ 1 phút" },
  });

  const watchHistoryLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Tần suất đồng bộ tiến độ quá dày đặc" },
  });

  app.use(globalLimiter);
  app.use("/api/v1/auth/forgot-password", forgotPasswordLimiter);
  app.use("/api/v1/auth/login", authLimiter);
  app.use("/api/v1/auth/register", authLimiter);
  app.use("/api/v1/movies/search", searchLimiter);
  app.use("/api/v1/movies/:id/reviews", reviewLimiter);
  app.use("/api/v1/users/me/watch-history", watchHistoryLimiter);

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
