import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  Res,
  Headers,
  Ip,
  Param,
  Query,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { AuthGuard } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { RegisterDto, LoginDto } from "./dto/auth.dto";
import { Response } from "express";

@Controller("auth")
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearCookies(res: Response) {
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("accessToken", "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 0,
    });

    res.cookie("refreshToken", "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 0,
    });
  }

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
    @Headers("user-agent") userAgent: string,
    @Ip() ip: string,
  ) {
    const tokens = await this.authService.register(dto, userAgent, ip);
    this.setCookies(res, tokens.accessToken, tokens.refreshToken);
    return { success: true, message: "Đăng ký thành công" };
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
  @UseGuards(AuthGuard("google"))
  async googleAuth(@Request() req) {}

  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
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

  @Post("verify-email")
  @HttpCode(200)
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

  @Post("2fa/setup")
  @UseGuards(AuthGuard("jwt"))
  setup2FA(@Request() req) {
    return this.authService.setup2FA(req.user.id);
  }

  @Post("2fa/verify")
  @UseGuards(AuthGuard("jwt"))
  verify2FA(
    @Request() req,
    @Body() dto: import("./dto/auth.dto").TwoFactorVerifyDto,
  ) {
    return this.authService.verify2FA(req.user.id, dto);
  }

  @Post("2fa/disable")
  @UseGuards(AuthGuard("jwt"))
  disable2FA(
    @Request() req,
    @Body() dto: import("./dto/auth.dto").TwoFactorVerifyDto,
  ) {
    return this.authService.disable2FA(req.user.id, dto);
  }

  @Post("2fa/login-verify")
  @HttpCode(200)
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
  async lockAccount(@Query("token") token: string) {
    if (!token) throw new BadRequestException("Mã token không hợp lệ.");
    const result = await this.authService.lockAccount(token);
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
            <h1>🔒 Đã Khóa Tài Khoản</h1>
            <p>${result.message}</p>
            <p>Vui lòng liên hệ với bộ phận hỗ trợ khách hàng để được xác minh danh tính và mở khóa tài khoản.</p>
          </div>
        </body>
      </html>
    `;
  }
}
