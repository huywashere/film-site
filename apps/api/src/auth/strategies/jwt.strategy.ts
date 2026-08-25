import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { sessionContextMatches } from "../session-context";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: any) => {
          let data = request?.cookies?.accessToken;
          if (!data) {
            data = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
          }
          return data;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get("JWT_SECRET"),
      passReqToCallback: true,
    });
  }

  async validate(request: any, payload: any) {
    if (!payload?.sub || !payload?.jti) {
      throw new UnauthorizedException("Phiên đăng nhập không còn hợp lệ");
    }

    const [user, session] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          username: true,
          isLocked: true,
          isBanned: true,
        },
      }),
      this.prisma.refreshToken.findUnique({ where: { id: payload.jti } }),
    ]);
    if (
      !user ||
      user.isLocked ||
      user.isBanned ||
      !session ||
      session.userId !== payload.sub ||
      session.isRevoked ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException("Phiên đăng nhập không còn hợp lệ");
    }
    if (
      !sessionContextMatches(
        session,
        {
          userAgent: request?.headers?.["user-agent"],
          ipAddress: request?.ip,
        },
        process.env.USER_SESSION_BIND_IP === "true",
      )
    ) {
      await this.prisma.refreshToken.update({
        where: { id: session.id },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException("Phiên đăng nhập không đúng thiết bị");
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      jti: payload.jti,
    };
  }
}
