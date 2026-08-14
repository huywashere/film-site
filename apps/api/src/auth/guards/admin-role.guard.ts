import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if user is authenticated and is the sole designated Admin
    const userEmail = (user?.email || "").toLowerCase();
    const isSoleAdmin = userEmail === "huywashere@gmail.com";

    if (!user || (!isSoleAdmin && user.role !== "ADMIN")) {
      throw new ForbiddenException(
        "Quyền truy cập bị từ chối. Chỉ tài khoản Admin duy nhất mới có quyền thực hiện thao tác này.",
      );
    }
    return true;
  }
}
