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

    // Check if user is authenticated and has role 'ADMIN'
    if (!user || user.role !== "ADMIN") {
      throw new ForbiddenException(
        "Quyền truy cập bị từ chối. Chỉ tài khoản Admin mới có quyền thực hiện thao tác này.",
      );
    }
    return true;
  }
}
