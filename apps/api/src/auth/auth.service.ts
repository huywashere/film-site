import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  TwoFactorVerifyDto,
  TwoFactorLoginVerifyDto,
  ChangePasswordDto,
} from "./dto/auth.dto";
import { MailService } from "../mail/mail.service";
import { UAParser } from "ua-parser-js";
import { generateSecret, verify, generateURI } from "otplib";
import * as QRCode from "qrcode";
import { RedisCacheService } from "../redis/redis.service";
import { sessionContextMatches } from "./session-context";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  /** Max failed logins per account before temporary lockout */
  private readonly MAX_FAILED_LOGINS = 10;
  /** Lockout duration in seconds (15 minutes) */
  private readonly LOCKOUT_TTL = 15 * 60;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mailService: MailService,
    private cache: RedisCacheService,
  ) {}

  private getCryptoKey(secret: string): Buffer {
    return createHash("sha256").update(secret).digest();
  }

  /** Returns the AES-256 key dedicated to TOTP secret encryption.
   *  Uses TOTP_ENCRYPTION_KEY env var — intentionally separate from JWT_SECRET
   *  so a leaked signing secret cannot also decrypt 2FA secrets.
   */
  private getTotpEncryptionKey(): Buffer {
    const key = this.config.get<string>("TOTP_ENCRYPTION_KEY");
    if (!key) {
      this.logger.warn(
        "TOTP_ENCRYPTION_KEY is not set — falling back to JWT_SECRET. " +
        "Set a dedicated TOTP_ENCRYPTION_KEY to isolate 2FA encryption.",
      );
    }
    const fallback = this.config.get<string>("JWT_SECRET");
    if (!key && !fallback) {
      throw new Error("TOTP_ENCRYPTION_KEY is required");
    }
    return this.getCryptoKey(key || fallback!);
  }

  private encrypt(text: string): string {
    const iv = randomBytes(12);
    const key = this.getTotpEncryptionKey();
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return [
      "v2",
      iv.toString("hex"),
      cipher.getAuthTag().toString("hex"),
      encrypted.toString("hex"),
    ].join(":");
  }

  private decrypt(text: string): string {
    if (text.startsWith("v2:")) {
      const [, ivHex, authTagHex, encryptedHex] = text.split(":");
      if (!ivHex || !authTagHex || !encryptedHex) {
        throw new Error("Invalid encrypted TOTP secret");
      }
      const decipher = createDecipheriv(
        "aes-256-gcm",
        this.getTotpEncryptionKey(),
        Buffer.from(ivHex, "hex"),
      );
      decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
      return Buffer.concat([
        decipher.update(Buffer.from(encryptedHex, "hex")),
        decipher.final(),
      ]).toString();
    }

    // Backward-compatible read path. Existing CBC values are re-encrypted as
    // authenticated GCM the next time 2FA is set up.
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const key = this.getTotpEncryptionKey();
    const decipher = createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  private assertAccountCanAuthenticate(user: {
    isLocked: boolean;
    isBanned: boolean;
  }): void {
    if (user.isLocked || user.isBanned) {
      throw new UnauthorizedException(
        "Tài khoản hiện không được phép đăng nhập. Vui lòng liên hệ hỗ trợ.",
      );
    }
  }

  private generateSecureToken(id: string): {
    plainToken: string;
    tokenHash: Promise<string>;
  } {
    const randomString = randomBytes(32).toString("hex");
    const plainToken = `${id}.${randomString}`;
    const tokenHash = bcrypt.hash(randomString, 10);
    return { plainToken, tokenHash };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const username = dto.username.trim();
    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      throw new ConflictException(
        "Thông tin đăng ký không hợp lệ hoặc đã tồn tại",
      );
    }

    const hash = await bcrypt.hash(dto.password, 12);
    const isDev = process.env.NODE_ENV !== "production";
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        passwordHash: hash,
        displayName: username,
        isEmailVerified: isDev,
      },
    });

    void this.sendTelegramNewUserAlert({
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      provider: "Email / Mật khẩu",
    });

    // Create Verification Token
    const verifyRecord = await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: "pending", // placeholder
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    const { plainToken, tokenHash } = this.generateSecureToken(verifyRecord.id);
    await this.prisma.verificationToken.update({
      where: { id: verifyRecord.id },
      data: { tokenHash: await tokenHash },
    });

    // Send email asynchronously
    this.mailService
      .sendVerificationEmail(user.email, plainToken)
      .catch((err) => {
        this.logger.error(
          `Error sending verification email to ${user.email}`,
          err,
        );
      });

    return { requiresEmailVerification: true };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const parts = dto.token.split(".");
    if (parts.length !== 2) throw new BadRequestException("Token không hợp lệ");
    const [tokenId, randomString] = parts;

    const record = await this.prisma.verificationToken.findUnique({
      where: { id: tokenId },
    });

    if (!record)
      throw new BadRequestException("Token không tồn tại hoặc đã được sử dụng");
    if (new Date() > record.expiresAt)
      throw new BadRequestException("Token đã hết hạn");

    const isValid = await bcrypt.compare(randomString, record.tokenHash);
    if (!isValid) throw new BadRequestException("Token không hợp lệ");

    // Update user
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { isEmailVerified: true },
    });

    // Delete token
    await this.prisma.verificationToken.delete({ where: { id: tokenId } });

    return { success: true, message: "Xác thực email thành công" };
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    // Normalise identifier for the brute-force key (email or username)
    const identifier = dto.email.toLowerCase().trim();
    const failKey = `login_fail:${identifier}`;

    // Check per-account lockout before hitting the DB
    const failCountRaw = await this.cache.get(failKey);
    const failCount = failCountRaw ? parseInt(failCountRaw, 10) : 0;
    if (failCount >= this.MAX_FAILED_LOGINS) {
      throw new UnauthorizedException(
        "Tài khoản tạm thời bị khóa do quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.",
      );
    }

    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { username: dto.email.trim() }] },
    });

    if (!user) {
      // Increment fail counter even for non-existent accounts to avoid user enumeration timing
      await this.cache.set(failKey, String(failCount + 1), this.LOCKOUT_TTL);
      throw new UnauthorizedException("Thông tin đăng nhập không hợp lệ");
    }

    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match) {
      const newCount = failCount + 1;
      await this.cache.set(failKey, String(newCount), this.LOCKOUT_TTL);
      if (newCount >= this.MAX_FAILED_LOGINS) {
        this.logger.warn(
          `Account brute-force lockout triggered for identifier: ${identifier}`,
        );
      }
      throw new UnauthorizedException("Thông tin đăng nhập không hợp lệ");
    }

    this.assertAccountCanAuthenticate(user);
    if (!user.isEmailVerified && process.env.NODE_ENV === "production") {
      throw new UnauthorizedException(
        "Vui lòng xác minh email trước khi đăng nhập.",
      );
    }

    // Successful login — clear the fail counter
    await this.cache.del(failKey);

    if (user.twoFactorEnabled) {
      const tempToken = await this.jwt.signAsync(
        { sub: user.id, type: "2fa_temp" },
        { secret: this.config.get("JWT_SECRET"), expiresIn: "5m" },
      );
      return { require2FA: true, tempToken };
    }

    return this.signTokens(
      user.id,
      user.email,
      user.username,
      userAgent,
      ipAddress,
    );
  }


  async signTokens(
    userId: string,
    email: string,
    username: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const tokenRecord = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: "pending",
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    const payload = { sub: userId, email, username, jti: tokenRecord.id };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        expiresIn: this.config.get("JWT_EXPIRES_IN") || "7d",
        secret: this.config.get("JWT_SECRET"),
      }),
      this.jwt.signAsync(payload, {
        expiresIn: this.config.get("JWT_REFRESH_EXPIRES_IN") || "30d",
        secret: this.config.get("JWT_REFRESH_SECRET"),
      }),
    ]);

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { tokenHash },
    });

    // Alert logic from Mục 4: check for new device warning asynchronously
    this.checkNewDeviceAndWarn(userId, email, userAgent, ipAddress).catch(
      (err) => {
        this.logger.error(
          `Error checking new device warning for ${email}: ${err.message}`,
          err,
        );
      },
    );

    return { accessToken, refreshToken };
  }

  async refreshTokens(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    try {
      const payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get("JWT_REFRESH_SECRET"),
      });

      const tokenId = payload.jti;
      const userId = payload.sub;

      const record = await this.prisma.refreshToken.findUnique({
        where: { id: tokenId },
        include: { user: true },
      });

      if (!record)
        throw new UnauthorizedException("Refresh token không tồn tại");

      if (record.userId !== userId) {
        throw new UnauthorizedException("Refresh token không hợp lệ");
      }

      this.assertAccountCanAuthenticate(record.user);

      if (record.isRevoked) {
        await this.prisma.refreshToken.updateMany({
          where: { userId },
          data: { isRevoked: true },
        });
        throw new UnauthorizedException(
          "Phát hiện hành vi bất thường, vui lòng đăng nhập lại",
        );
      }

      if (new Date() > record.expiresAt) {
        throw new UnauthorizedException("Refresh token đã hết hạn");
      }

      if (
        !sessionContextMatches(
          record,
          { userAgent, ipAddress },
          process.env.USER_SESSION_BIND_IP === "true",
        )
      ) {
        await this.prisma.refreshToken.update({
          where: { id: record.id },
          data: { isRevoked: true },
        });
        throw new UnauthorizedException("Phiên đăng nhập không đúng thiết bị");
      }

      const isMatch = await bcrypt.compare(refreshToken, record.tokenHash);
      if (!isMatch)
        throw new UnauthorizedException("Refresh token không hợp lệ");

      const claimed = await this.prisma.refreshToken.updateMany({
        where: { id: record.id, userId, isRevoked: false },
        data: { isRevoked: true, lastUsedAt: new Date() },
      });

      if (claimed.count !== 1) {
        await this.prisma.refreshToken.updateMany({
          where: { userId },
          data: { isRevoked: true },
        });
        throw new UnauthorizedException(
          "Phát hiện refresh token được sử dụng lại, vui lòng đăng nhập lại",
        );
      }

      return this.signTokens(
        userId,
        payload.email,
        payload.username,
        userAgent || record.userAgent || undefined,
        ipAddress || record.ipAddress || undefined,
      );
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException(
        "Refresh token không hợp lệ hoặc đã hết hạn",
      );
    }
  }

  async logout(userId: string, currentSessionId?: string) {
    if (currentSessionId) {
      await this.prisma.refreshToken.update({
        where: { id: currentSessionId },
        data: { isRevoked: true },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const successMessage = {
      success: true,
      message: "Nếu email tồn tại, một đường link khôi phục đã được gửi",
    };

    if (!user) return successMessage;

    await this.prisma.resetPasswordToken.deleteMany({
      where: { userId: user.id },
    });

    const resetRecord = await this.prisma.resetPasswordToken.create({
      data: {
        userId: user.id,
        tokenHash: "pending",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    const { plainToken, tokenHash } = this.generateSecureToken(resetRecord.id);
    await this.prisma.resetPasswordToken.update({
      where: { id: resetRecord.id },
      data: { tokenHash: await tokenHash },
    });

    this.mailService
      .sendPasswordResetEmail(user.email, plainToken)
      .catch((err) => {
        this.logger.error(`Error sending password reset to ${user.email}`, err);
      });

    return successMessage;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const parts = dto.token.split(".");
    if (parts.length !== 2) throw new BadRequestException("Token không hợp lệ");
    const [tokenId, randomString] = parts;

    const record = await this.prisma.resetPasswordToken.findUnique({
      where: { id: tokenId },
    });

    const errorMsg = "Token không hợp lệ hoặc đã hết hạn";

    if (!record) throw new BadRequestException(errorMsg);
    if (new Date() > record.expiresAt) throw new BadRequestException(errorMsg);

    const isValid = await bcrypt.compare(randomString, record.tokenHash);
    if (!isValid) throw new BadRequestException(errorMsg);

    const newHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: newHash },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: record.userId },
      data: { isRevoked: true },
    });

    await this.prisma.resetPasswordToken.delete({ where: { id: tokenId } });

    return {
      success: true,
      message:
        "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại trên các thiết bị.",
    };
  }

  async validateGoogleUser(
    profile: any,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const { googleId, email, firstName, lastName, picture, emailVerified } =
      profile;
    if (!email || emailVerified !== true) {
      throw new UnauthorizedException(
        "Google chưa xác minh email của tài khoản này.",
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await this.prisma.user.findUnique({
      where: { googleId },
    });

    if (user) {
      this.assertAccountCanAuthenticate(user);
      return this.signTokens(
        user.id,
        user.email,
        user.username,
        userAgent,
        ipAddress,
      );
    }

    user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      this.assertAccountCanAuthenticate(user);
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId,
          isEmailVerified: true,
        },
      });
      return this.signTokens(
        user.id,
        user.email,
        user.username,
        userAgent,
        ipAddress,
      );
    }

    const randomPass = "google_oauth_" + randomBytes(16).toString("hex");
    const hash = await bcrypt.hash(randomPass, 12);
    const baseUsername =
      normalizedEmail.split("@")[0].toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, "") ||
      "user";
    const existingWithUsername = await this.prisma.user.findUnique({
      where: { username: baseUsername },
    });
    const username = existingWithUsername
      ? `${baseUsername}_${randomBytes(3).toString("hex")}`
      : baseUsername;

    user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        username,
        passwordHash: hash,
        displayName: `${firstName || ""} ${lastName || ""}`.trim() || username,
        avatarUrl: picture || null,
        isEmailVerified: true,
        googleId,
      },
    });

    void this.sendTelegramNewUserAlert({
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      provider: "Google OAuth",
    });

    return this.signTokens(
      user.id,
      user.email,
      user.username,
      userAgent,
      ipAddress,
    );
  }

  async linkGoogleAccount(userId: string, profile: any) {
    const { googleId, email, emailVerified } = profile || {};
    if (!googleId || !email || emailVerified !== true) {
      throw new UnauthorizedException(
        "Google chưa xác minh email của tài khoản này.",
      );
    }

    const [user, linkedAccount] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.user.findUnique({ where: { googleId } }),
    ]);
    if (!user) throw new UnauthorizedException("Tài khoản không tồn tại");
    this.assertAccountCanAuthenticate(user);
    if (linkedAccount && linkedAccount.id !== userId) {
      throw new ConflictException(
        "Tài khoản Google này đã được liên kết với một tài khoản khác.",
      );
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { googleId, isEmailVerified: true },
      select: { id: true, username: true, googleId: true },
    });
  }

  async changePassword(
    userId: string,
    currentSessionId: string,
    dto: ChangePasswordDto,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("Tài khoản không tồn tại");
    this.assertAccountCanAuthenticate(user);

    const currentPasswordMatches = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!currentPasswordMatches) {
      throw new UnauthorizedException("Mật khẩu hiện tại không chính xác");
    }
    if (await bcrypt.compare(dto.newPassword, user.passwordHash)) {
      throw new BadRequestException("Mật khẩu mới phải khác mật khẩu hiện tại");
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: {
          userId,
          id: currentSessionId ? { not: currentSessionId } : undefined,
          isRevoked: false,
        },
        data: { isRevoked: true },
      }),
      this.prisma.resetPasswordToken.deleteMany({ where: { userId } }),
    ]);

    return {
      success: true,
      message: "Đã đổi mật khẩu và đăng xuất các thiết bị khác.",
    };
  }

  async validateFirebaseUser(
    profile: {
      uid: string;
      email?: string;
      name?: string;
      picture?: string;
      emailVerified?: boolean;
    },
    userAgent?: string,
    ipAddress?: string,
  ) {
    if (!profile.email) {
      throw new BadRequestException("Tài khoản Google chưa cung cấp email");
    }
    if (!profile.emailVerified && process.env.NODE_ENV === "production") {
      throw new UnauthorizedException(
        "Email Firebase phải được xác minh trước khi đăng nhập hoặc liên kết tài khoản.",
      );
    }

    const email = profile.email.toLowerCase();
    const providerId = `firebase:${profile.uid}`;
    let user = await this.prisma.user.findUnique({
      where: { googleId: providerId },
    });

    if (!user) {
      user = await this.prisma.user.findUnique({ where: { email } });
    }

    if (user) {
      this.assertAccountCanAuthenticate(user);
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: providerId,
          displayName: profile.name || user.displayName,
          avatarUrl: profile.picture || user.avatarUrl,
          isEmailVerified: profile.emailVerified || user.isEmailVerified,
        },
      });
    } else {
      const randomPass = `firebase_oauth_${randomBytes(16).toString("hex")}`;
      const baseUsername =
        email.split("@")[0].toLowerCase().replace(/[^a-zA-Z0-9_.-]/g, "") ||
        "user";
      const existingUser = await this.prisma.user.findUnique({
        where: { username: baseUsername },
      });
      const username = existingUser
        ? `${baseUsername}_${randomBytes(3).toString("hex")}`
        : baseUsername;

      user = await this.prisma.user.create({
        data: {
          email,
          username,
          passwordHash: await bcrypt.hash(randomPass, 12),
          displayName: profile.name || username,
          avatarUrl: profile.picture || null,
          googleId: providerId,
          isEmailVerified: Boolean(profile.emailVerified),
        },
      });

      void this.sendTelegramNewUserAlert({
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        provider: "OAuth",
      });
    }

    const tokens = await this.signTokens(
      user.id,
      user.email,
      user.username,
      userAgent,
      ipAddress,
    );

    // Returning the public account alongside the cookie tokens removes the
    // fragile second `/auth/me` request immediately after an OAuth exchange.
    // The browser still only receives the tokens as httpOnly cookies.
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        role: user.role,
        googleId: user.googleId,
        twoFactorEnabled: user.twoFactorEnabled,
        isLocked: user.isLocked,
      },
    };
  }

  async setup2FA(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException("User không tồn tại");
    this.assertAccountCanAuthenticate(user);
    if (user.twoFactorEnabled) {
      throw new BadRequestException(
        "2FA đang hoạt động. Hãy tắt 2FA trước khi thiết lập lại.",
      );
    }

    const secret = generateSecret();
    const encryptedSecret = this.encrypt(secret);

    const plainBackupCodes: string[] = [];
    const hashedBackupCodes: string[] = [];

    for (let i = 0; i < 10; i++) {
      const code = randomBytes(4).toString("hex");
      plainBackupCodes.push(code);
      hashedBackupCodes.push(await bcrypt.hash(code, 10));
    }

    await this.prisma.twoFactorAuth.upsert({
      where: { userId },
      update: {
        secret: encryptedSecret,
        backupCodes: hashedBackupCodes,
      },
      create: {
        userId,
        secret: encryptedSecret,
        backupCodes: hashedBackupCodes,
      },
    });

    const otpauth = generateURI({
      secret,
      label: user.email,
      issuer: "FlexPhim",
    });
    const qrCode = await QRCode.toDataURL(otpauth);

    return {
      qrCode,
      secret,
      backupCodes: plainBackupCodes,
    };
  }

  async verify2FA(userId: string, dto: TwoFactorVerifyDto) {
    const record = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!record) throw new BadRequestException("Chưa thiết lập 2FA");

    const decryptedSecret = this.decrypt(record.secret);
    if (!record.secret.startsWith("v2:")) {
      await this.prisma.twoFactorAuth.update({
        where: { userId },
        data: { secret: this.encrypt(decryptedSecret) },
      });
    }
    const isValid = await verify({
      token: dto.code,
      secret: decryptedSecret,
    });

    if (!isValid) throw new BadRequestException("Mã xác thực OTP không đúng");

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { success: true, message: "Đã bật xác thực 2 lớp thành công" };
  }

  async disable2FA(userId: string, dto: TwoFactorVerifyDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException("User không tồn tại");
    if (
      user.role === "ADMIN" ||
      (user.role !== "USER" && user.adminAccessEnabled)
    ) {
      throw new ForbiddenException(
        "Tài khoản Control Room bắt buộc duy trì xác thực hai bước.",
      );
    }

    const record = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!record) throw new BadRequestException("Chưa thiết lập 2FA");

    const decryptedSecret = this.decrypt(record.secret);
    const isValid = await verify({
      token: dto.code,
      secret: decryptedSecret,
    });

    if (!isValid) throw new BadRequestException("Mã xác thực OTP không đúng");

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false },
    });

    await this.prisma.twoFactorAuth.delete({
      where: { userId },
    });

    return { success: true, message: "Đã tắt xác thực 2 lớp thành công" };
  }

  async loginVerify2FA(
    dto: TwoFactorLoginVerifyDto,
    userAgent?: string,
    ipAddress?: string,
  ) {
    try {
      const payload = await this.jwt.verifyAsync(dto.tempToken, {
        secret: this.config.get("JWT_SECRET"),
      });

      if (payload.type !== "2fa_temp") {
        throw new UnauthorizedException("Token không hợp lệ");
      }

      const userId = payload.sub;
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new UnauthorizedException("User không tồn tại");
      this.assertAccountCanAuthenticate(user);

      const record = await this.prisma.twoFactorAuth.findUnique({
        where: { userId },
      });

      if (!record) throw new UnauthorizedException("Chưa thiết lập 2FA");

      const decryptedSecret = this.decrypt(record.secret);
      if (!record.secret.startsWith("v2:")) {
        await this.prisma.twoFactorAuth.update({
          where: { userId },
          data: { secret: this.encrypt(decryptedSecret) },
        });
      }
      let isValid = (await verify({
        token: dto.code,
        secret: decryptedSecret,
      })) as any;

      if (!isValid) {
        const backupCodes = record.backupCodes;
        let matchedIndex = -1;

        for (let i = 0; i < backupCodes.length; i++) {
          const match = await bcrypt.compare(dto.code, backupCodes[i]);
          if (match) {
            matchedIndex = i;
            break;
          }
        }

        if (matchedIndex !== -1) {
          isValid = true;

          const updatedBackupCodes = [...backupCodes];
          updatedBackupCodes.splice(matchedIndex, 1);
          await this.prisma.twoFactorAuth.update({
            where: { userId },
            data: { backupCodes: updatedBackupCodes },
          });
        }
      }

      if (!isValid) {
        throw new UnauthorizedException("Mã OTP hoặc mã dự phòng không đúng");
      }

      return this.signTokens(
        user.id,
        user.email,
        user.username,
        userAgent,
        ipAddress,
      );
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException("Mã xác thực hoặc token hết hạn");
    }
  }

  async verifyAdminSecondFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { twoFactorAuth: true },
    });
    if (!user) throw new UnauthorizedException("Tài khoản quản trị không tồn tại");
    this.assertAccountCanAuthenticate(user);
    if (
      user.role === "USER" ||
      (!user.adminAccessEnabled && user.role !== "ADMIN") ||
      !user.twoFactorEnabled ||
      !user.twoFactorAuth
    ) {
      throw new UnauthorizedException("Tài khoản chưa sẵn sàng cho xác thực Admin 2FA");
    }

    const decryptedSecret = this.decrypt(user.twoFactorAuth.secret);
    let validCode = Boolean(await verify({ token: code, secret: decryptedSecret }));
    if (!validCode) {
      for (let index = 0; index < user.twoFactorAuth.backupCodes.length; index += 1) {
        if (await bcrypt.compare(code, user.twoFactorAuth.backupCodes[index])) {
          validCode = true;
          await this.prisma.twoFactorAuth.update({
            where: { userId },
            data: {
              backupCodes: user.twoFactorAuth.backupCodes.filter(
                (_, codeIndex) => codeIndex !== index,
              ),
            },
          });
          break;
        }
      }
    }
    if (!validCode) throw new UnauthorizedException("Mã OTP hoặc mã dự phòng không đúng");
    return user;
  }

  async getSessions(userId: string, currentSessionId?: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: "desc" },
    });

    return tokens.map((t) => {
      const parser = new UAParser(t.userAgent || "");
      const browser = parser.getBrowser();
      const os = parser.getOS();
      const device = parser.getDevice();

      const browserName = browser.name
        ? `${browser.name} ${browser.version || ""}`
        : "Unknown Browser";
      const osName = os.name ? `${os.name} ${os.version || ""}` : "Unknown OS";
      const deviceName = device.model
        ? `${device.vendor || ""} ${device.model}`
        : "";

      return {
        id: t.id,
        ipAddress: t.ipAddress || "Unknown IP",
        userAgent: t.userAgent,
        browser: browserName.trim(),
        os: osName.trim(),
        device: deviceName.trim() || undefined,
        lastUsedAt: t.lastUsedAt,
        createdAt: t.createdAt,
        isCurrent: t.id === currentSessionId,
      };
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const record = await this.prisma.refreshToken.findUnique({
      where: { id: sessionId },
    });

    if (!record || record.userId !== userId) {
      throw new BadRequestException(
        "Session không tồn tại hoặc không thuộc về tài khoản này",
      );
    }

    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    });

    return { success: true, message: "Đã đăng xuất thiết bị thành công" };
  }

  async revokeAllSessions(userId: string, excludeSessionId?: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
        id: excludeSessionId ? { not: excludeSessionId } : undefined,
      },
      data: { isRevoked: true },
    });

    return {
      success: true,
      message: "Đã đăng xuất toàn bộ thiết bị khác thành công",
    };
  }

  async checkNewDeviceAndWarn(
    userId: string,
    email: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    if (!userAgent) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pastSessions = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const currentSession = await this.prisma.refreshToken.findFirst({
      where: { userId, userAgent, ipAddress, isRevoked: false },
      orderBy: { createdAt: "desc" },
    });

    const sessionsToCheck = pastSessions.filter(
      (s) => s.id !== currentSession?.id,
    );

    if (sessionsToCheck.length === 0) {
      return;
    }

    const parser = new UAParser(userAgent);
    const currentBrowser = parser.getBrowser().name || "Unknown";
    const currentOS = parser.getOS().name || "Unknown";

    let isNewDevice = true;
    for (const sess of sessionsToCheck) {
      if (!sess.userAgent) continue;
      const pastParser = new UAParser(sess.userAgent);
      const pastBrowser = pastParser.getBrowser().name || "Unknown";
      const pastOS = pastParser.getOS().name || "Unknown";

      if (currentBrowser === pastBrowser && currentOS === pastOS) {
        isNewDevice = false;
        break;
      }
    }

    if (isNewDevice) {
      this.logger.log(
        `Suspicious login detected for user ${email}. Generating suspiciousToken.`,
      );
      const suspiciousToken = randomBytes(32).toString("hex");
      // Store only the hash — plaintext is sent via email; DB holds the hash only
      const suspiciousTokenHash = await bcrypt.hash(suspiciousToken, 10);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          suspiciousToken: suspiciousTokenHash,
          suspiciousTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      await this.mailService.sendNewDeviceAlertEmail(email, {
        browser: currentBrowser,
        os: currentOS,
        ipAddress: ipAddress || "Unknown IP",
        token: `${userId}.${suspiciousToken}`,
      });
    }
  }

  async lockAccount(suspiciousToken: string) {
    const [userId, randomToken, ...extra] = suspiciousToken.split(".");
    if (!userId || !randomToken || extra.length > 0) {
      throw new BadRequestException(
        "Mã xác thực khóa tài khoản không hợp lệ hoặc đã được sử dụng.",
      );
    }

    const matchedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        suspiciousToken: true,
        suspiciousTokenExpiresAt: true,
        isLocked: true,
      },
    });
    const isExpired =
      !matchedUser?.suspiciousTokenExpiresAt ||
      matchedUser.suspiciousTokenExpiresAt.getTime() < Date.now();
    const isMatch =
      Boolean(matchedUser?.suspiciousToken) &&
      !matchedUser!.isLocked &&
      !isExpired &&
      (await bcrypt.compare(randomToken, matchedUser!.suspiciousToken!));

    if (!isMatch) {
      throw new BadRequestException(
        "Mã xác thực khóa tài khoản không hợp lệ hoặc đã hết hạn.",
      );
    }

    await this.prisma.user.update({
      where: { id: matchedUser.id },
      data: {
        isLocked: true,
        suspiciousToken: null,
        suspiciousTokenExpiresAt: null,
      },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: matchedUser.id },
      data: { isRevoked: true },
    });

    return {
      success: true,
      message:
        "Tài khoản của bạn đã được khóa để bảo mật. Tất cả các phiên đăng nhập đã bị hủy.",
    };
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        nameColor: true,
        avatarFrameColor: true,
        bio: true,
        createdAt: true,
        isEmailVerified: true,
        googleId: true,
        twoFactorEnabled: true,
        role: true,
        adminAccessEnabled: true,
        isLocked: true,
        _count: {
          select: {
            watchlist: true,
            reviews: true,
            followers: true,
            following: true,
          },
        },
      },
    });
  }

  private async sendTelegramNewUserAlert(user: {
    email: string;
    username: string;
    displayName?: string | null;
    provider?: string;
  }) {
    const token =
      this.config.get<string>("TELEGRAM_BOT_TOKEN") ||
      process.env.TELEGRAM_BOT_TOKEN;
    const chatId =
      this.config.get<string>("TELEGRAM_ALERT_CHAT_ID") ||
      this.config.get<string>("TELEGRAM_CHAT_ID") ||
      process.env.TELEGRAM_ALERT_CHAT_ID ||
      process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return;
    }

    const timeStr = new Date().toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
    const providerStr = user.provider || "Email";
    const text =
      `🎉 <b>NGƯỜI DÙNG MỚI ĐĂNG KÝ!</b>\n\n` +
      `👤 <b>Username:</b> <code>${user.username}</code>\n` +
      `📧 <b>Email:</b> <code>${user.email}</code>\n` +
      (user.displayName && user.displayName !== user.username
        ? `🏷️ <b>Tên hiển thị:</b> ${user.displayName}\n`
        : "") +
      `🔐 <b>Phương thức:</b> ${providerStr}\n` +
      `⏰ <b>Thời gian:</b> ${timeStr}\n` +
      `🌐 <b>Hệ thống:</b> FlexPhim`;

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          parse_mode: "HTML",
          text,
        }),
        signal: AbortSignal.timeout(5000),
      });
    } catch (err: any) {
      this.logger.warn(`Failed to send new user Telegram alert: ${err?.message}`);
    }
  }
}
