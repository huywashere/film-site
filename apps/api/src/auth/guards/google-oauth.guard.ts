import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { randomBytes, timingSafeEqual } from "crypto";
import type { Request, Response } from "express";

type OAuthRequest = Request & { cineverseOAuthState?: string };

@Injectable()
export class GoogleOAuthGuard extends AuthGuard("google") {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OAuthRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const isCallback = request.path.endsWith("/google/callback");

    if (isCallback) {
      const received = String(request.query.state || "");
      const expected = String(request.cookies?.cineverse_oauth_state || "");
      response.clearCookie("cineverse_oauth_state", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/v1/auth/google/callback",
      });

      const receivedBuffer = Buffer.from(received);
      const expectedBuffer = Buffer.from(expected);
      if (
        receivedBuffer.length === 0 ||
        receivedBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(receivedBuffer, expectedBuffer)
      ) {
        throw new UnauthorizedException("OAuth state không hợp lệ");
      }
    } else {
      const state = randomBytes(32).toString("base64url");
      request.cineverseOAuthState = state;
      response.cookie("cineverse_oauth_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/v1/auth/google/callback",
        maxAge: 10 * 60 * 1000,
      });
    }

    return (await super.canActivate(context)) as boolean;
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<OAuthRequest>();
    return request.cineverseOAuthState
      ? { state: request.cineverseOAuthState }
      : undefined;
  }
}
