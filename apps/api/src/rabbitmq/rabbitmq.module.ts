import { Module, Global, forwardRef } from '@nestjs/common';
import { RabbitMQModule as NestRabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQService } from './rabbitmq.service';
import { CrawlConsumer } from './consumers/crawl.consumer';
import { CacheConsumer } from './consumers/cache.consumer';
import { NETPHIM_TOPIC_EXCHANGE } from './rabbitmq.constants';
import { AdminModule } from '../admin/admin.module';
import { RedisCacheModule } from '../redis/redis.module';

@Global()
@Module({
  imports: [
    NestRabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>(
          'RABBITMQ_URL',
          'amqp://guest:guest@localhost:5672',
        );
        const isRabbitEnabled = config.get<string>('RABBITMQ_ENABLED') === 'true';
        return {
          exchanges: [
            {
              name: NETPHIM_TOPIC_EXCHANGE,
              type: 'topic',
              options: {
                durable: true,
              },
            },
          ],
          uri,
          connectionInitOptions: {
            wait: false, // Do not block server startup if broker is temporarily connecting
            timeout: 2000,
          },
          registerHandlers: isRabbitEnabled,
          enableControllerDiscovery: isRabbitEnabled,
        };
      },
    }),
    forwardRef(() => AdminModule),
    RedisCacheModule,
  ],
  providers: [RabbitMQService, CrawlConsumer, CacheConsumer],
  exports: [RabbitMQService, NestRabbitMQModule],
})
export class RabbitMQModule {}
