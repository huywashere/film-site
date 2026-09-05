import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SystemNotificationsService } from './system-notifications.service';

@Controller('system-notifications')
export class SystemNotificationsController {
  constructor(
    private readonly systemNotificationsService: SystemNotificationsService,
  ) {}

  /**
   * Public: Get all active system broadcast notifications
   */
  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  getPublicNotifications() {
    return this.systemNotificationsService.getPublicNotifications();
  }
}
