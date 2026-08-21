import { Body, Controller, Get, Headers, HttpCode, Ip, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsEmail, IsOptional, IsString, IsUrl, Matches, MaxLength } from "class-validator";
import { AdminAccessService } from "./admin-access.service";

class AdminLoginDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?:\d{6}|[a-f0-9]{8})$/i)
  code?: string;
}

class AdminGithubCallbackDto {
  @IsString()
  @MaxLength(256)
  code!: string;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43,128}$/)
  codeVerifier!: string;

  @IsUrl({ require_protocol: true, require_tld: false, protocols: ["http", "https"] })
  @MaxLength(500)
  redirectUri!: string;
}

class AdminGithubCompleteDto {
  @IsString()
  @MaxLength(256)
  challenge!: string;

  @IsString()
  @Matches(/^(?:\d{6}|[a-f0-9]{8})$/i)
  code!: string;
}

@Controller("admin-auth")
export class AdminAuthController {
  constructor(private readonly access: AdminAccessService) {}

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() body: AdminLoginDto, @Ip() ip: string, @Headers("user-agent") userAgent?: string) {
    return this.access.login(body, { ipAddress: ip, userAgent });
  }

  @Post("github")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  github(
    @Body() body: AdminGithubCallbackDto,
    @Ip() ip: string,
    @Headers("user-agent") userAgent?: string,
  ) {
    return this.access.loginWithGithub(body, { ipAddress: ip, userAgent });
  }

  @Post("github/complete")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  completeGithub(
    @Body() body: AdminGithubCompleteDto,
    @Ip() ip: string,
    @Headers("user-agent") userAgent?: string,
  ) {
    return this.access.completeGithubSecondFactor(body, { ipAddress: ip, userAgent });
  }

  @Get("me")
  me(@Headers("x-admin-session-token") token = "") {
    return this.access.resolve(token);
  }

  @Post("logout")
  @HttpCode(200)
  logout(@Headers("x-admin-session-token") token = "") {
    return this.access.logout(token);
  }
}
