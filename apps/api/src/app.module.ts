import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { RedisThrottlerStorage } from "./throttler-redis.storage";
import { RedisCacheModule } from "./redis/redis.module";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { MoviesModule } from "./movies/movies.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { RatingsModule } from "./ratings/ratings.module";
import { WatchlistModule } from "./watchlist/watchlist.module";
import { MailModule } from "./mail/mail.module";
import { HealthModule } from "./health/health.module";
import { WatchHistoryModule } from "./watch-history/watch-history.module";
import { AdminModule } from "./admin/admin.module";
import { validateEnv } from "./config/env.validation";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Global Redis cache module – available to all feature modules
    RedisCacheModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            // @nestjs/throttler v6 expects ttl in milliseconds. The previous
            // value of 60 meant a 60ms window, i.e. effectively no limit.
            ttl: 60_000,
            limit: 100,
          },
        ],
        // Passing storage here registers it as the ThrottlerStorage provider so
        // the guard resolves it through DI.
        storage: new RedisThrottlerStorage(
          config.get<string>("REDIS_URL", "redis://localhost:6379"),
        ),
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    MoviesModule,
    ReviewsModule,
    RatingsModule,
    WatchlistModule,
    MailModule,
    HealthModule,
    WatchHistoryModule,
    AdminModule,
  ],
  providers: [
    // Applied globally through the DI container so ThrottlerGuard receives the
    // Redis-backed storage above. Constructing the guard by hand in main.ts
    // silently gave it an empty storage object, disabling all rate limiting.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
