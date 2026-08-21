import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ADMIN_PERMISSIONS_KEY, AdminPermission } from "../admin-permissions";

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<AdminPermission[]>(ADMIN_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) || [];
    const permissions: string[] = context.switchToHttp().getRequest().user?.permissions || [];
    if (permissions.includes("*") || required.every((item) => permissions.includes(item))) return true;
    throw new ForbiddenException("Tài khoản không có quyền thực hiện thao tác này");
  }
}
