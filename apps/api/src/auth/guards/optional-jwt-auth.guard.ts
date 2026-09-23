import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Attaches a valid JWT user when one is present, while allowing genuinely
 * anonymous requests to continue. Invalid/expired credentials are treated as
 * anonymous here because the guarded endpoints never grant user privileges.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser = unknown>(
    _err: unknown,
    user: TUser | false | null,
  ): TUser | undefined {
    return user || undefined;
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
