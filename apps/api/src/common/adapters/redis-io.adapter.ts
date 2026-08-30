import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Logger, type INestApplication } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(app: INestApplication) {
    super(app);
  }

  async connectToRedis(redisUrl: string): Promise<void> {
    let pubClient: Redis | null = null;
    let subClient: Redis | null = null;

    try {
      const connectionOptions = {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        lazyConnect: true,
        enableOfflineQueue: false,
        retryStrategy: () => null,
      } as const;

      pubClient = new Redis(redisUrl, connectionOptions);
      subClient = pubClient.duplicate(connectionOptions);

      pubClient.on('error', (err) => {
        this.logger.warn(`Redis pubClient error: ${err.message}`);
      });
      subClient.on('error', (err) => {
        this.logger.warn(`Redis subClient error: ${err.message}`);
      });

      // ioredis connects asynchronously. Await both clients before installing
      // the adapter so an unavailable optional Redis instance cannot crash the
      // API later through an unhandled subscription promise.
      await Promise.all([pubClient.connect(), subClient.connect()]);

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log('✅ Socket.IO Redis Adapter connected – multi-node sync active');
    } catch (err) {
      pubClient?.disconnect();
      subClient?.disconnect();
      this.logger.warn(
        `⚠️ Failed to connect Socket.IO Redis Adapter: ${
          err instanceof Error ? err.message : String(err)
        }. Falling back to default in-memory adapter.`,
      );
      this.adapterConstructor = null;
    }
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
