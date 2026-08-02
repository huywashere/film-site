import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
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
        // Admin SDK — never from anything the client can influence.
        role: claims.raw.role === "ADMIN" ? "ADMIN" : "USER",
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
