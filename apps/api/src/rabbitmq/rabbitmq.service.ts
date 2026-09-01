import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  NETPHIM_TOPIC_EXCHANGE,
  RABBITMQ_ROUTING_KEYS,
  CrawlJobMessage,
  MovieUpdatedMessage,
  CacheInvalidateMessage,
} from './rabbitmq.constants';

@Injectable()
export class RabbitMQService {
  private readonly logger = new Logger(RabbitMQService.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  /**
   * Publish a background movie crawl/sync job into RabbitMQ
   */
  async publishCrawlJob(payload: Omit<CrawlJobMessage, 'timestamp'>): Promise<boolean> {
    try {
      const message: CrawlJobMessage = {
        ...payload,
        timestamp: new Date().toISOString(),
      };
      await this.amqpConnection.publish(
        NETPHIM_TOPIC_EXCHANGE,
        RABBITMQ_ROUTING_KEYS.MOVIE_CRAWL_REQUESTED,
        message,
        {
          persistent: true,
          contentType: 'application/json',
        },
      );
      this.logger.log(`[RabbitMQ] Published crawl job ${payload.jobId} (source: ${payload.source})`);
      return true;
    } catch (error) {
      this.logger.error(`[RabbitMQ] Failed to publish crawl job: ${error}`);
      return false;
    }
  }

  /**
   * Publish a movie update event to trigger cache invalidation and re-indexing
   */
  async publishMovieUpdated(payload: Omit<MovieUpdatedMessage, 'timestamp'>): Promise<boolean> {
    try {
      const message: MovieUpdatedMessage = {
        ...payload,
        timestamp: new Date().toISOString(),
      };
      await this.amqpConnection.publish(
        NETPHIM_TOPIC_EXCHANGE,
        RABBITMQ_ROUTING_KEYS.MOVIE_UPDATED,
        message,
        {
          contentType: 'application/json',
        },
      );
      this.logger.log(`[RabbitMQ] Published movie updated event: ${payload.slug}`);
      return true;
    } catch (error) {
      this.logger.error(`[RabbitMQ] Failed to publish movie updated event: ${error}`);
      return false;
    }
  }

  /**
   * Publish cache invalidation request
   */
  async publishCacheInvalidation(patterns: string[], reason?: string): Promise<boolean> {
    try {
      const message: CacheInvalidateMessage = {
        patterns,
        reason,
        timestamp: new Date().toISOString(),
      };
      await this.amqpConnection.publish(
        NETPHIM_TOPIC_EXCHANGE,
        RABBITMQ_ROUTING_KEYS.CACHE_INVALIDATE,
        message,
        {
          contentType: 'application/json',
        },
      );
      return true;
    } catch (error) {
      this.logger.error(`[RabbitMQ] Failed to publish cache invalidation: ${error}`);
      return false;
    }
  }
}
