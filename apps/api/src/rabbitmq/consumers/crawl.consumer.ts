import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import {
  NETPHIM_TOPIC_EXCHANGE,
  RABBITMQ_QUEUES,
  RABBITMQ_ROUTING_KEYS,
  CrawlJobMessage,
} from '../rabbitmq.constants';
import { AdminService } from '../../admin/admin.service';

@Injectable()
export class CrawlConsumer {
  private readonly logger = new Logger(CrawlConsumer.name);

  constructor(private readonly adminService: AdminService) {}

  @RabbitSubscribe({
    exchange: NETPHIM_TOPIC_EXCHANGE,
    routingKey: RABBITMQ_ROUTING_KEYS.MOVIE_CRAWL_REQUESTED,
    queue: RABBITMQ_QUEUES.MOVIE_CRAWL,
    queueOptions: {
      durable: true,
      arguments: {
        'x-max-priority': 10,
      },
    },
  })
  async handleCrawlJob(message: CrawlJobMessage) {
    this.logger.log(
      `[RabbitMQ Consumer] Received crawl job: ${message.jobId} (Source: ${message.source}, Pages: ${message.pages})`,
    );

    try {
      await this.adminService.executeSyncJob(message.jobId);
      this.logger.log(`[RabbitMQ Consumer] Successfully completed crawl job: ${message.jobId}`);
    } catch (error) {
      this.logger.error(
        `[RabbitMQ Consumer] Failed to process crawl job ${message.jobId}: ${error}`,
      );
    }
  }
}
