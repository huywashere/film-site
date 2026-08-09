import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";

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
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        username: true,
        isLocked: true,
        isBanned: true,
      },
    });
    if (!user || user.isLocked || user.isBanned) {
      throw new UnauthorizedException("Phiên đăng nhập không còn hợp lệ");
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      jti: payload.jti,
    };
  }
}
