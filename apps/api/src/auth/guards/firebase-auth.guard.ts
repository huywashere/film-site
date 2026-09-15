import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { timingSafeEqual } from "crypto";
import {
  FirebaseTokenVerifier,
  FirebaseTokenError,
} from "../firebase-token-verifier.service";

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(private readonly verifier: FirebaseTokenVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const dashboardToken = String(
      request.headers["x-admin-dashboard-token"] || "",
    );
    const expectedDashboardToken = process.env.ADMIN_DASHBOARD_API_TOKEN || "";
    if (
      expectedDashboardToken.length >= 32 &&
      dashboardToken.length === expectedDashboardToken.length &&
      timingSafeEqual(
        Buffer.from(dashboardToken),
        Buffer.from(expectedDashboardToken),
      )
    ) {
      const forwardedFor = String(request.headers["x-forwarded-for"] || "")
        .split(",")[0]
        .trim();
      request.user = {
        uid: "admin-dashboard-service",
        email: process.env.ADMIN_DASHBOARD_EMAIL || "admin@netphim.local",
        name: "Quản trị FlexPhim",
        role: "ADMIN",
        internalDashboard: true,
        ipAddress: forwardedFor || request.ip || request.socket?.remoteAddress,
        userAgent: String(request.headers["user-agent"] || "").slice(0, 1000),
      };
      return true;
    }
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException(
        "Thiếu token xác thực Firebase (Authorization: Bearer <token>)",
      );
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      throw new UnauthorizedException("Thiếu token xác thực Firebase");
    }

    try {
      // Verifies the RS256 signature against Google's published certificates and
      // checks iss/aud/exp. Decoding the payload without this is not authentication:
      // anyone can craft a JWT body claiming any uid.
      const claims = await this.verifier.verify(token);

      request.user = {
        uid: claims.uid,
        email: claims.email,
        name: claims.name,
        picture: claims.picture,
        emailVerified: claims.emailVerified,
        // Roles must come from Firebase custom claims set server-side via the
        // Admin SDK, or match the designated sole super admin email.
        role:
          claims.raw.role === "ADMIN" ||
          claims.email?.toLowerCase() === "huywashere@gmail.com"
            ? "ADMIN"
            : "USER",
        ipAddress:
          String(request.headers["x-forwarded-for"] || "")
            .split(",")[0]
            .trim() ||
          request.ip ||
          request.socket?.remoteAddress,
        userAgent: String(request.headers["user-agent"] || "").slice(0, 1000),
      };

      return true;
    } catch (error) {
      const reason =
        error instanceof FirebaseTokenError || error instanceof Error
          ? error.message
          : String(error);
      this.logger.warn(`Rejected Firebase ID token: ${reason}`);

      throw new UnauthorizedException(
        "Token Firebase không hợp lệ hoặc đã hết hạn.",
      );
    }
  }
}
