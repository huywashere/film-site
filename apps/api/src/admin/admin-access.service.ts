import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import type { User } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import { RedisCacheService } from "../redis/redis.service";
import { permissionsFor } from "./admin-permissions";
import {
  AdminRequestContext,
  adminContextFingerprint,
  adminSessionContextMatches,
  normalizeAdminContext,
} from "./admin-session-context";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class AdminAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly cache: RedisCacheService,
  ) {}

  async loginWithGithub(
    input: { code: string; codeVerifier: string; redirectUri: string },
    context: AdminRequestContext,
  ) {
    const clientId = process.env.GITHUB_ADMIN_CLIENT_ID?.trim();
    const clientSecret = process.env.GITHUB_ADMIN_CLIENT_SECRET?.trim();
    const callbackUrl = (
      process.env.ADMIN_GITHUB_CALLBACK_URL ||
      "http://localhost:3002/api/auth/github/callback"
    ).trim();
    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException(
        "GitHub Admin OAuth chưa được cấu hình",
      );
    }
    if (input.redirectUri !== callbackUrl) {
      throw new UnauthorizedException("GitHub OAuth callback không hợp lệ");
    }

    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "FlexPhim-Admin",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: input.code,
          redirect_uri: callbackUrl,
          code_verifier: input.codeVerifier,
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    const tokenPayload = (await tokenResponse.json().catch(() => ({}))) as {
      access_token?: string;
    };
    if (!tokenResponse.ok || !tokenPayload.access_token) {
      throw new UnauthorizedException("GitHub không chấp nhận mã đăng nhập");
    }

    const githubHeaders = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${tokenPayload.access_token}`,
      "User-Agent": "FlexPhim-Admin",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const [profileResponse, emailsResponse] = await Promise.all([
      fetch("https://api.github.com/user", {
        headers: githubHeaders,
        signal: AbortSignal.timeout(10_000),
      }),
      fetch("https://api.github.com/user/emails", {
        headers: githubHeaders,
        signal: AbortSignal.timeout(10_000),
      }),
    ]);
    if (!profileResponse.ok || !emailsResponse.ok) {
      throw new UnauthorizedException(
        "Không đọc được danh tính GitHub đã xác minh",
      );
    }
    const profile = (await profileResponse.json()) as {
      id?: number;
      login?: string;
    };
    const githubId = String(profile.id || "");
    const githubLogin = String(profile.login || "").toLowerCase();
    const emails = (await emailsResponse.json()) as Array<{
      email?: string;
      verified?: boolean;
    }>;
    const verifiedEmails = emails
      .filter((entry) => entry.verified && entry.email)
      .map((entry) => String(entry.email).toLowerCase());
    if (!githubId || !githubLogin || !verifiedEmails.length) {
      throw new UnauthorizedException("GitHub chưa cung cấp email đã xác minh");
    }

    const allowedLogins = (process.env.ADMIN_GITHUB_ALLOWED_LOGINS || "")
      .split(",")
      .map((login) => login.trim().toLowerCase())
      .filter(Boolean);
    const allowedIds = (process.env.ADMIN_GITHUB_ALLOWED_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (!allowedIds.length) {
      throw new ServiceUnavailableException(
        "GitHub Admin OAuth chưa cấu hình ID tài khoản được phép",
      );
    }
    if (
      !allowedIds.includes(githubId) ||
      (allowedLogins.length && !allowedLogins.includes(githubLogin))
    ) {
      throw new UnauthorizedException(
        "Tài khoản GitHub này không nằm trong danh sách Admin",
      );
    }

    let user = await this.prisma.user.findUnique({ where: { githubId } });
    if (!user) {
      user = await this.prisma.user.findFirst({
        where: { email: { in: verifiedEmails, mode: "insensitive" } },
      });
    }
    this.assertAdminUser(user);
    if (user.githubId && user.githubId !== githubId) {
      throw new UnauthorizedException(
        "Tài khoản Admin đã liên kết với GitHub khác",
      );
    }
    if (!user.githubId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { githubId },
      });
    }

    const require2FA = process.env.ADMIN_REQUIRE_2FA === "true";
    if (require2FA && !user.twoFactorEnabled) {
      throw new UnauthorizedException(
        "Admin phải bật xác thực 2 lớp FlexPhim trước khi đăng nhập bằng GitHub",
      );
    }
    if (require2FA && user.twoFactorEnabled) {
      const challenge = randomBytes(48).toString("base64url");
      await this.cache.setJson(
        `admin_github_challenge:${hashToken(challenge)}`,
        {
          userId: user.id,
          contextFingerprint: adminContextFingerprint(context),
        },
        5 * 60,
      );
      return { requires2FA: true as const, challenge };
    }
    return this.createSession(user, context);
  }

  async completeGithubSecondFactor(
    input: { challenge: string; code: string },
    context: AdminRequestContext,
  ) {
    const key = `admin_github_challenge:${hashToken(input.challenge)}`;
    const pending = await this.cache.getJson<{
      userId: string;
      contextFingerprint: string;
    }>(key);
    await this.cache.del(key);
    if (
      !pending?.userId ||
      pending.contextFingerprint !== adminContextFingerprint(context)
    ) {
      throw new UnauthorizedException("Phiên xác minh GitHub đã hết hạn");
    }
    const user = await this.auth.verifyAdminSecondFactor(
      pending.userId,
      input.code,
    );
    return this.createSession(user, context);
  }

  async resolve(token: string, context: AdminRequestContext) {
    if (!token || token.length < 40) throw new UnauthorizedException();
    const session = await this.prisma.adminSession.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.isBanned ||
      session.user.isLocked ||
      session.user.role === "USER" ||
      (!session.user.adminAccessEnabled && session.user.role !== "ADMIN")
    ) {
      throw new UnauthorizedException(
        "Phiên Admin không hợp lệ hoặc đã hết hạn",
      );
    }
    if (
      !adminSessionContextMatches(
        { ipAddress: session.ipAddress, userAgent: session.userAgent },
        context,
      )
    ) {
      await this.prisma.adminSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        "Phiên Admin đã bị thu hồi do thiết bị hoặc địa chỉ mạng thay đổi",
      );
    }
    if (Date.now() - session.lastSeenAt.getTime() > 60_000) {
      void this.prisma.adminSession.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
      });
    }
    return { ...this.toActor(session.user), sessionId: session.id };
  }

  async devLogin(context: AdminRequestContext) {
    if (process.env.NODE_ENV === "production") {
      throw new UnauthorizedException("Chỉ khả dụng trong chế độ Development");
    }
    let user = await this.prisma.user.findFirst({
      where: { role: "ADMIN" },
    });
    if (!user) {
      user = await this.prisma.user.findFirst();
    }
    if (!user) {
      throw new UnauthorizedException("Không tìm thấy tài khoản người dùng trong CSDL");
    }
    return this.createSession(user, context);
  }

  async logout(token: string) {
    if (token) {
      await this.prisma.adminSession.updateMany({
        where: { tokenHash: hashToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { success: true };
  }

  private assertAdminUser(user: User | null): asserts user is User {
    if (
      !user ||
      user.isBanned ||
      user.isLocked ||
      user.role === "USER" ||
      (!user.adminAccessEnabled && user.role !== "ADMIN")
    ) {
      throw new UnauthorizedException(
        "GitHub chưa liên kết với tài khoản Admin hợp lệ",
      );
    }
  }

  private async createSession(user: User, context: AdminRequestContext) {
    const token = randomBytes(48).toString("base64url");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const normalizedContext = normalizeAdminContext(context);
    await this.prisma.adminSession.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt,
        ipAddress: normalizedContext.ipAddress,
        userAgent: normalizedContext.userAgent,
      },
    });
    return { token, expiresAt, user: this.toActor(user) };
  }

  private toActor(user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: string;
    adminPermissions: string[];
    twoFactorEnabled: boolean;
  }) {
    return {
      uid: user.id,
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.displayName || user.username,
      displayName: user.displayName || user.username,
      picture: user.avatarUrl,
      role: user.role,
      permissions: permissionsFor(user.role, user.adminPermissions),
      twoFactorEnabled: user.twoFactorEnabled,
      internalDashboard: true,
    };
  }
}
