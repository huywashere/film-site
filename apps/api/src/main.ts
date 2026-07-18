import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Security headers (Helmet) ──────────────────────────────────
  // Protects against well-known web vulnerabilities by setting HTTP headers
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
