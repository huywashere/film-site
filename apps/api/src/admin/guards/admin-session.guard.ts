import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AdminAccessService } from "../admin-access.service";

@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(private readonly access: AdminAccessService) {}

  async canActivate(executionContext: ExecutionContext) {
    const request = executionContext.switchToHttp().getRequest();
    const token = String(request.headers["x-admin-session-token"] || "");
    const context = {
      ipAddress: request.ip,
      userAgent: String(request.headers["user-agent"] || ""),
    };
    request.user = await this.access.resolve(token, context);
    request.user.ipAddress = context.ipAddress;
    request.user.userAgent = context.userAgent.slice(0, 1000);
    return true;
  }
}
