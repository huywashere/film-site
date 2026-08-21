import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AdminAccessService } from "../admin-access.service";

@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(private readonly access: AdminAccessService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = String(request.headers["x-admin-session-token"] || "");
    request.user = await this.access.resolve(token);
    request.user.ipAddress =
      String(request.headers["x-forwarded-for"] || "").split(",")[0].trim() || request.ip;
    request.user.userAgent = String(request.headers["user-agent"] || "").slice(0, 1000);
    return true;
  }
}
