import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import {
  NETPHIM_TOPIC_EXCHANGE,
  RABBITMQ_QUEUES,
  RABBITMQ_ROUTING_KEYS,
  MovieUpdatedMessage,
  CacheInvalidateMessage,
} from '../rabbitmq.constants';
import { RedisCacheService } from '../../redis/redis.service';

@Injectable()
export class CacheConsumer {
  private readonly logger = new Logger(CacheConsumer.name);

  constructor(private readonly redis: RedisCacheService) {}

  @RabbitSubscribe({
    exchange: NETPHIM_TOPIC_EXCHANGE,
    routingKey: RABBITMQ_ROUTING_KEYS.MOVIE_UPDATED,
    queue: RABBITMQ_QUEUES.CACHE_INVALIDATION,
    queueOptions: {
      durable: true,
    },
  })
  async handleMovieUpdated(message: MovieUpdatedMessage) {
    this.logger.log(
      `[RabbitMQ Consumer] Invaliding cache for updated movie: ${message.slug}`,
    );

    try {
      // Invalidate movie detail and list caches
      await Promise.all([
        this.redis.del(`movie:${message.slug}`),
        this.redis.del(`movie:id:${message.movieId}`),
        this.redis.del(`site:home:featured`),
      ]);
    } catch (error) {
      this.logger.error(
        `[RabbitMQ Consumer] Error invalidating cache for ${message.slug}: ${error}`,
      );
    }
  }

  @RabbitSubscribe({
    exchange: NETPHIM_TOPIC_EXCHANGE,
    routingKey: RABBITMQ_ROUTING_KEYS.CACHE_INVALIDATE,
    queue: `${RABBITMQ_QUEUES.CACHE_INVALIDATION}.direct`,
    queueOptions: {
      durable: true,
    },
  })
  async handleDirectCacheInvalidate(message: CacheInvalidateMessage) {
    this.logger.log(
      `[RabbitMQ Consumer] Direct cache invalidate request for ${message.patterns.length} patterns`,
    );

    for (const pattern of message.patterns) {
      try {
        await this.redis.del(pattern);
      } catch (error) {
        this.logger.error(`Failed to delete pattern ${pattern}: ${error}`);
      }
    }
  }
}
