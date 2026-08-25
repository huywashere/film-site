import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { randomBytes, timingSafeEqual } from "crypto";
import type { Request, Response } from "express";

type OAuthRequest = Request & {
  cineverseOAuthState?: string;
  cineverseOAuthCallbackUrl?: string;
};

@Injectable()
export class GoogleOAuthGuard extends AuthGuard("google") {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OAuthRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const isCallback = /\/google(?:\/link)?\/callback$/.test(request.path);
    const isLinkFlow = request.path.includes("/google/link");
    const configuredCallback = process.env.GOOGLE_CALLBACK_URL ||
      "http://localhost:3001/api/v1/auth/google/callback";
    request.cineverseOAuthCallbackUrl = isLinkFlow
      ? process.env.GOOGLE_LINK_CALLBACK_URL ||
        configuredCallback.replace(/\/google\/callback$/, "/google/link/callback")
      : configuredCallback;

    if (isCallback) {
      const received = String(request.query.state || "");
      const expected = String(request.cookies?.cineverse_oauth_state || "");
      response.clearCookie("cineverse_oauth_state", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/v1/auth/google",
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
        path: "/api/v1/auth/google",
        maxAge: 10 * 60 * 1000,
      });
    }

    return (await super.canActivate(context)) as boolean;
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<OAuthRequest>();
    return {
      ...(request.cineverseOAuthState
        ? { state: request.cineverseOAuthState }
        : {}),
      callbackURL: request.cineverseOAuthCallbackUrl,
    };
  }
}
