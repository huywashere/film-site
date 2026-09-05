import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisCacheModule } from '../redis/redis.module';
import { SystemNotificationsService } from './system-notifications.service';
import { SystemNotificationsController } from './system-notifications.controller';

@Module({
  imports: [PrismaModule, RedisCacheModule],
  controllers: [SystemNotificationsController],
  providers: [SystemNotificationsService],
  exports: [SystemNotificationsService],
})
export class SystemNotificationsModule {}
