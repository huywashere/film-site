import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
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
} from "./dto/auth.dto";
import { MailService } from "../mail/mail.service";
import { UAParser } from "ua-parser-js";
import { generateSecret, verify, generateURI } from "otplib";
import * as QRCode from "qrcode";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mailService: MailService,
  ) {}

  private getCryptoKey(secret: string): Buffer {
    return createHash("sha256").update(secret).digest();
  }

  private encrypt(text: string): string {
    const keyString = this.config.get("JWT_SECRET") || "default_crypto_secret";
    const iv = randomBytes(16);
    const key = this.getCryptoKey(keyString);
    const cipher = createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  }

  private decrypt(text: string): string {
    const keyString = this.config.get("JWT_SECRET") || "default_crypto_secret";
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const key = this.getCryptoKey(keyString);
    const decipher = createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
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

  async register(dto: RegisterDto, userAgent?: string, ipAddress?: string) {
    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });

    if (existingUser) {
      throw new ConflictException(
        "Thông tin đăng ký không hợp lệ hoặc đã tồn tại",
      );
    }

    const hash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash: hash,
        displayName: dto.username,
      },
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

    return this.signTokens(
      user.id,
      user.email,
      user.username,
      userAgent,
      ipAddress,
    );
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
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.email }] },
    });

    if (!user)
      throw new UnauthorizedException("Thông tin đăng nhập không hợp lệ");

    if (user.isLocked) {
      throw new UnauthorizedException(
        "Tài khoản đã bị khóa do có hoạt động bất thường. Vui lòng liên hệ hỗ trợ.",
      );
    }

    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match)
      throw new UnauthorizedException("Thông tin đăng nhập không hợp lệ");

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
    expiresAt.setDate(expiresAt.getDate() + 7);

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
        expiresIn: "15m",
        secret: this.config.get("JWT_SECRET"),
      }),
      this.jwt.signAsync(payload, {
        expiresIn: "7d",
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
      });

      if (!record)
        throw new UnauthorizedException("Refresh token không tồn tại");

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

      const isMatch = await bcrypt.compare(refreshToken, record.tokenHash);
      if (!isMatch)
        throw new UnauthorizedException("Refresh token không hợp lệ");

      await this.prisma.refreshToken.update({
        where: { id: record.id },
        data: { isRevoked: true },
      });

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
    const { googleId, email, firstName, lastName, picture } = profile;

    let user = await this.prisma.user.findUnique({
      where: { googleId },
    });

    if (user) {
      return this.signTokens(
        user.id,
        user.email,
        user.username,
        userAgent,
        ipAddress,
      );
    }

    user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
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
    const suffix = randomBytes(4).toString("hex");
    const username = `${email.split("@")[0]}_${suffix}`;

    user = await this.prisma.user.create({
      data: {
        email,
        username,
        passwordHash: hash,
        displayName: `${firstName || ""} ${lastName || ""}`.trim() || username,
        avatarUrl: picture || null,
        isEmailVerified: true,
        googleId,
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

  async setup2FA(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException("User không tồn tại");

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
      issuer: "CineVerse",
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

      const record = await this.prisma.twoFactorAuth.findUnique({
        where: { userId },
      });

      if (!record) throw new UnauthorizedException("Chưa thiết lập 2FA");

      const decryptedSecret = this.decrypt(record.secret);
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

      await this.prisma.user.update({
        where: { id: userId },
        data: { suspiciousToken },
      });

      await this.mailService.sendNewDeviceAlertEmail(email, {
        browser: currentBrowser,
        os: currentOS,
        ipAddress: ipAddress || "Unknown IP",
        token: suspiciousToken,
      });
    }
  }

  async lockAccount(suspiciousToken: string) {
    const user = await this.prisma.user.findFirst({
      where: { suspiciousToken },
    });

    if (!user) {
      throw new BadRequestException(
        "Mã xác thực khóa tài khoản không hợp lệ hoặc đã được sử dụng.",
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isLocked: true,
        suspiciousToken: null,
      },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id },
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
        bio: true,
        createdAt: true,
        isEmailVerified: true,
        googleId: true,
        twoFactorEnabled: true,
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
}
