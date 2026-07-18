import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisThrottlerStorage } from './throttler-redis.storage';
import { RedisCacheModule } from './redis/redis.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MoviesModule } from './movies/movies.module';
import { ReviewsModule } from './reviews/reviews.module';
import { RatingsModule } from './ratings/ratings.module';
import { WatchlistModule } from './watchlist/watchlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global Redis cache module – available to all feature modules
    RedisCacheModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: 60000,
            limit: 100,
          },
        ],
        storage: new RedisThrottlerStorage(config.get<string>('REDIS_URL', 'redis://localhost:6379')),
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    MoviesModule,
    ReviewsModule,
    RatingsModule,
    WatchlistModule,
  ],
})
export class AppModule {}
