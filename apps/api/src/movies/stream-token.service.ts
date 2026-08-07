import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

@Injectable()
export class StreamTokenService {
  private readonly secretKey: string;
  private readonly tokenTtlSeconds = 600; // 10 minutes TTL

  constructor(private readonly configService: ConfigService) {
    this.secretKey =
      this.configService.get<string>("JWT_SECRET") ||
      "cineverse-stream-secret-key-2026-production";
  }

  /**
   * Generates a signed, time-bound HMAC token for streaming media resources.
   * Prevents direct URL scraping and unauthorized hotlinking.
   */
  generateStreamToken(filmIdOrSlug: string, userId?: string): { token: string; expiresAt: number } {
    const expiresAt = Math.floor(Date.now() / 1000) + this.tokenTtlSeconds;
    const payload = `${filmIdOrSlug}:${userId || "anonymous"}:${expiresAt}`;
    
    const signature = crypto
      .createHmac("sha256", this.secretKey)
      .update(payload)
      .digest("hex");

    const token = `${expiresAt}.${signature}`;
    return { token, expiresAt };
  }

  /**
   * Verifies an incoming HMAC stream token and checks expiration.
   */
  verifyStreamToken(filmIdOrSlug: string, token: string, userId?: string): boolean {
    if (!token || !token.includes(".")) {
      throw new UnauthorizedException("Mã Token phát phim không hợp lệ");
    }

    const [expiresAtStr, signature] = token.split(".");
    const expiresAt = parseInt(expiresAtStr, 10);

    if (isNaN(expiresAt) || Math.floor(Date.now() / 1000) > expiresAt) {
      throw new UnauthorizedException("Mã Token phát phim đã hết hạn");
    }

    const payload = `${filmIdOrSlug}:${userId || "anonymous"}:${expiresAtStr}`;
    const expectedSignature = crypto
      .createHmac("sha256", this.secretKey)
      .update(payload)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      throw new UnauthorizedException("Chữ ký Token phát phim không chính xác");
    }

    return true;
  }
}
