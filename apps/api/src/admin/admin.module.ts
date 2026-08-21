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

@Module({
  imports: [PrismaModule, AuthModule, WatchPartyModule, SiteConfigModule],
  controllers: [AdminController, AdminAuthController],
  providers: [AdminService, AdminOperationsService, AuditService, AdminAccessService, AdminSessionGuard, AdminPermissionGuard],
  exports: [AdminService, AuditService],
})
export class AdminModule {}
