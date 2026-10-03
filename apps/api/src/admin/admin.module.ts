import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AuditService } from "../audit/audit.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { WatchPartyModule } from "../watch-party/watch-party.module";
import { SiteConfigModule } from "../site-config/site-config.module";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminAccessService } from "./admin-access.service";
import { AdminSessionGuard } from "./guards/admin-session.guard";
import { AdminPermissionGuard } from "./guards/admin-permission.guard";
import { AdminOperationsService } from "./admin-operations.service";

import { MoviesModule } from "../movies/movies.module";
import { AdsModule } from "../ads/ads.module";
import { SystemNotificationsModule } from "../system-notifications/system-notifications.module";
import { AdminSecurityService } from "./admin-security.service";
import { AdminSyncSchedulerService } from "./admin-sync-scheduler.service";
import { MediaIngestService } from "./media-ingest.service";
import { CrawlerService } from "./crawler.service";
import { StoryboardService } from "./storyboard.service";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    WatchPartyModule,
    SiteConfigModule,
    MoviesModule,
    AdsModule,
    SystemNotificationsModule,
  ],
  controllers: [AdminController, AdminAuthController],
  providers: [
    AdminService,
    AdminOperationsService,
    AdminSecurityService,
    AdminSyncSchedulerService,
    MediaIngestService,
    CrawlerService,
    StoryboardService,
    AuditService,
    AdminAccessService,
    AdminSessionGuard,
    AdminPermissionGuard,
  ],
  exports: [AdminService, AuditService, AdminSecurityService, AdminSyncSchedulerService, CrawlerService, StoryboardService],
})
export class AdminModule {}
