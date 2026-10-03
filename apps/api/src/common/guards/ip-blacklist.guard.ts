import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { RedisCacheService } from "../../redis/redis.service";

@Injectable()
export class IpBlacklistGuard implements CanActivate {
  constructor(private readonly cache: RedisCacheService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }
    const req = context.switchToHttp().getRequest();
    if (!req || !req.headers) {
      return true;
    }
    const clientIp = this.extractClientIp(req);

    if (!clientIp) return true;

    // Fast memory/Redis check (< 0.1ms)
    const isBlocked = await this.cache.get(`blacklist:ip:${clientIp}`);
    if (isBlocked) {
      throw new ForbiddenException({
        statusCode: 403,
        message: "Địa chỉ IP của bạn đã bị tạm khóa do vi phạm chính sách bảo mật.",
        error: "IP Blocked",
      });
    }

    return true;
  }

  private extractClientIp(req: any): string {
    if (!req || !req.headers) return "";
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded) {
      return forwarded.split(",")[0].trim();
    }
    const realIp = req.headers["x-real-ip"];
    if (typeof realIp === "string" && realIp) {
      return realIp.trim();
    }
    return req.socket?.remoteAddress || req.ip || "";
  }
}
