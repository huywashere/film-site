import {
  Controller,
  Post,
  Put,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  Res,
  Headers,
  Header,
  Ip,
  Param,
  Query,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { FirebaseAuthGuard } from "./guards/firebase-auth.guard";
import { TurnstileService } from "./turnstile.service";
import { RegisterDto, LoginDto, ChangePasswordDto } from "./dto/auth.dto";
import { Response } from "express";
import { GoogleOAuthGuard } from "./guards/google-oauth.guard";
import { GoogleLinkAuthGuard } from "./guards/google-link-auth.guard";
import { LockAccountDto } from "./dto/auth.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly turnstile: TurnstileService,
  ) {}

  private getCookieOptions(maxAge: number) {
    const requestedSameSite = (process.env.COOKIE_SAME_SITE || "lax").toLowerCase();
    const sameSite =
      requestedSameSite === "none"
        ? "none"
        : requestedSameSite === "strict"
          ? "strict"
          : "lax";
    const isProduction = process.env.NODE_ENV === "production";
    const domain = process.env.COOKIE_DOMAIN?.trim();

    return {
      httpOnly: true,
      // `none` is required only when the API and web app are genuinely
      // cross-site. It must always travel over HTTPS.
      secure: isProduction || sameSite === "none",
      sameSite: sameSite as "strict" | "lax" | "none",
      path: "/",
      maxAge,
      ...(domain ? { domain } : {}),
    };
  }

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie("accessToken", accessToken, this.getCookieOptions(15 * 60 * 1000));
    res.cookie(
      "refreshToken",
      refreshToken,
      this.getCookieOptions(7 * 24 * 60 * 60 * 1000),
    );
  }

  private clearCookies(res: Response) {
    res.cookie("accessToken", "", this.getCookieOptions(0));
    res.cookie("refreshToken", "", this.getCookieOptions(0));
  }

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    await this.turnstile.verify(dto.turnstileToken, ip, "register");
    const result = await this.authService.register(dto);
    this.clearCookies(res);
    return {
      success: true,
      ...result,
      message: "Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản.",
    };
  }

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Headers("user-agent") userAgent: string,
    @Ip() ip: string,
  ) {
    await this.turnstile.verify(dto.turnstileToken, ip, "login");
    const result = await this.authService.login(dto, userAgent, ip);
    if ("require2FA" in result) {
      return result;
    }
    this.setCookies(res, result.accessToken, result.refreshToken);
    return { success: true, message: "Đăng nhập thành công" };
  }

  @Post("refresh")
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async refresh(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
    @Headers("user-agent") userAgent: string,
    @Ip() ip: string,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token missing");
    }
    const tokens = await this.authService.refreshTokens(
      refreshToken,
      userAgent,
      ip,
    );
    this.setCookies(res, tokens.accessToken, tokens.refreshToken);
    return { success: true };
  }

  @Get("google")
  @UseGuards(GoogleOAuthGuard)
  async googleAuth(@Request() req) {}

  @Get("google/callback")
  @UseGuards(GoogleOAuthGuard)
  async googleAuthRedirect(
    @Request() req,
    @Res() res: Response,
    @Headers("user-agent") userAgent: string,
    @Ip() ip: string,
  ) {
    const tokens = await this.authService.validateGoogleUser(
      req.user,
      userAgent,
      ip,
    );
    this.setCookies(res, tokens.accessToken, tokens.refreshToken);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(frontendUrl);
  }

  @Get("google/link")
  @UseGuards(GoogleLinkAuthGuard, GoogleOAuthGuard)
  async googleLink() {}

  @Get("google/link/callback")
  @UseGuards(GoogleLinkAuthGuard, GoogleOAuthGuard)
  async googleLinkRedirect(@Request() req, @Res() res: Response) {
    const user = await this.authService.linkGoogleAccount(
      req.accountUser.id,
      req.user,
    );
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(
      `${frontendUrl}/user/${encodeURIComponent(user.username)}?tab=security&google_link=success`,
    );
  }

  /** Exchange a verified Firebase ID token for the normal NetPhim cookie session. */
  @Post("firebase")
  @UseGuards(FirebaseAuthGuard)
  async firebaseAuth(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
    @Headers("user-agent") userAgent: string,
    @Ip() ip: string,
  ) {
    const tokens = await this.authService.validateFirebaseUser(
      req.user,
      userAgent,
      ip,
    );
    this.setCookies(res, tokens.accessToken, tokens.refreshToken);
    return { success: true, user: tokens.user };
  }

  @Post("verify-email")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  verifyEmail(@Body() dto: import("./dto/auth.dto").VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post("forgot-password")
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // strict rate limit for sending emails
  forgotPassword(@Body() dto: import("./dto/auth.dto").ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post("reset-password")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  resetPassword(@Body() dto: import("./dto/auth.dto").ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post("logout")
  @HttpCode(200)
  @UseGuards(AuthGuard("jwt"))
  async logout(@Request() req, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.id, req.user.jti);
    this.clearCookies(res);
    return { success: true };
  }

  @Get("sessions")
  @UseGuards(AuthGuard("jwt"))
  getSessions(@Request() req) {
    return this.authService.getSessions(req.user.id, req.user.jti);
  }

  @Post("sessions/:id/revoke")
  @UseGuards(AuthGuard("jwt"))
  revokeSession(@Request() req, @Param("id") sessionId: string) {
    return this.authService.revokeSession(req.user.id, sessionId);
  }

  @Post("sessions/revoke-all")
  @UseGuards(AuthGuard("jwt"))
  revokeAllSessions(@Request() req) {
    return this.authService.revokeAllSessions(req.user.id, req.user.jti);
  }

  @Get("me")
  @UseGuards(AuthGuard("jwt"))
  getMe(@Request() req) {
    return this.authService.getMe(req.user.id);
  }

  @Put("change-password")
  @UseGuards(AuthGuard("jwt"))
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, req.user.jti, dto);
  }

  @Post("2fa/setup")
  @UseGuards(AuthGuard("jwt"))
  setup2FA(@Request() req) {
    return this.authService.setup2FA(req.user.id);
  }

  @Post("2fa/verify")
  @UseGuards(AuthGuard("jwt"))
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  verify2FA(
    @Request() req,
    @Body() dto: import("./dto/auth.dto").TwoFactorVerifyDto,
  ) {
    return this.authService.verify2FA(req.user.id, dto);
  }

  @Post("2fa/disable")
  @UseGuards(AuthGuard("jwt"))
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  disable2FA(
    @Request() req,
    @Body() dto: import("./dto/auth.dto").TwoFactorVerifyDto,
  ) {
    return this.authService.disable2FA(req.user.id, dto);
  }

  @Post("2fa/login-verify")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async loginVerify2FA(
    @Body() dto: import("./dto/auth.dto").TwoFactorLoginVerifyDto,
    @Res({ passthrough: true }) res: Response,
    @Headers("user-agent") userAgent: string,
    @Ip() ip: string,
  ) {
    const tokens = await this.authService.loginVerify2FA(dto, userAgent, ip);
    this.setCookies(res, tokens.accessToken, tokens.refreshToken);
    return { success: true, message: "Đăng nhập thành công" };
  }

  @Get("lock-account")
  @HttpCode(200)
  @Header("Content-Type", "text/html; charset=utf-8")
  @Header(
    "Content-Security-Policy",
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  )
  lockAccountConfirmation(@Query("token") token: string) {
    if (!token) throw new BadRequestException("Mã token không hợp lệ.");
    const escapedToken = token.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]!);
    return `
      <html>
        <head>
          <title>Khóa Tài Khoản Thành Công</title>
          <meta charset="utf-8">
          <style>
            body { font-family: sans-serif; background-color: #000; color: #fff; text-align: center; padding-top: 100px; }
            .card { max-width: 500px; margin: 0 auto; background: #111; padding: 40px; border-radius: 12px; border: 1px solid #d9534f; box-shadow: 0 4px 20px rgba(217, 83, 79, 0.4); }
            h1 { color: #d9534f; margin-bottom: 20px; }
            p { color: #ccc; line-height: 1.6; font-size: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Xác nhận khóa tài khoản</h1>
            <p>Chỉ tiếp tục nếu bạn không nhận ra lần đăng nhập vừa được thông báo.</p>
            <form method="post" action="/api/v1/auth/lock-account">
              <input type="hidden" name="token" value="${escapedToken}">
              <button type="submit">Khóa tài khoản và thu hồi mọi phiên</button>
            </form>
          </div>
        </body>
      </html>
    `;
  }

  @Post("lock-account")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async lockAccount(@Body() dto: LockAccountDto) {
    return this.authService.lockAccount(dto.token);
  }
}
