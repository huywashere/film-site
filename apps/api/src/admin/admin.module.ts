import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AuditService } from "../audit/audit.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { WatchPartyModule } from "../watch-party/watch-party.module";
import { SiteConfigModule } from "../site-config/site-config.module";

@Module({
  imports: [PrismaModule, AuthModule, WatchPartyModule, SiteConfigModule],
  controllers: [AdminController],
  providers: [AdminService, AuditService],
  exports: [AdminService, AuditService],
})
export class AdminModule {}
