import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';

// ── Sentry – init BEFORE creating the NestJS app so all errors are captured
// If SENTRY_DSN is not set, Sentry runs as a no-op (zero overhead)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Capture 10% of transactions for performance monitoring (cost-effective)
    tracesSampleRate: 0.1,
    // Don't send errors in test environment
    enabled: process.env.NODE_ENV !== 'test',
  });
  console.log('🔍 Sentry error tracking enabled');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Security headers (Helmet) ──────────────────────────────────
  // Protects against well-known web vulnerabilities by setting HTTP headers
  app.use(cookieParser());
  app.use(
    helmet({
      // Allow same-origin iframes (used by our own video player)
      frameguard: { action: 'sameorigin' },
      // Disable strict CSP — Next.js frontend handles its own CSP
      contentSecurityPolicy: false,
    }),
  );

  // ── Global prefix ─────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── CORS – restrict to trusted frontend origins ───────────────
  const origins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
    : ['http://localhost:3000'];

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Global rate limiting via DI container ─────────────────────
  // ThrottlerGuard is applied globally; per-controller @Throttle() overrides defaults
  const reflector = app.get(Reflector);
  const throttlerStorage = app.get('THROTTLER:MODULE_OPTIONS', { strict: false });
  app.useGlobalGuards(new ThrottlerGuard(throttlerStorage ?? {}, {} as any, reflector));

  // ── Global input validation ───────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown fields silently
      transform: true, // auto-cast @Query() params to correct types
      forbidNonWhitelisted: true, // reject requests with unknown fields (400)
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🎬 CineVerse API running on: http://localhost:${port}/api/v1`);
}

bootstrap();
