import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { RedisThrottlerStorage } from "./throttler-redis.storage";
import { RedisCacheModule } from "./redis/redis.module";
import { RabbitMQModule } from "./rabbitmq/rabbitmq.module";
import { StorageModule } from "./common/storage/storage.module";
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
import { WatchPartyModule } from "./watch-party/watch-party.module";
import { TelemetryModule } from "./telemetry/telemetry.module";
import { ReportsModule } from "./reports/reports.module";
import { SiteConfigModule } from "./site-config/site-config.module";
import { AdsModule } from "./ads/ads.module";
import { SystemNotificationsModule } from "./system-notifications/system-notifications.module";
import { RecommendationsModule } from "./recommendations/recommendations.module";
import { IpBlacklistGuard } from "./common/guards/ip-blacklist.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      validate: validateEnv,
    }),
    // Global Redis cache module – available to all feature modules
    RedisCacheModule,
    // Global RabbitMQ Event Broker module
    RabbitMQModule,
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
    WatchPartyModule,
    TelemetryModule,
    ReportsModule,
    SiteConfigModule,
    AdsModule,
    SystemNotificationsModule,
    RecommendationsModule,
    StorageModule,
  ],
  providers: [
    // Global IP Blacklist Guard (chống DDoS & chặn IP tức thì qua Redis)
    {
      provide: APP_GUARD,
      useClass: IpBlacklistGuard,
    },
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
