import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
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
    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      jti: payload.jti,
    };
  }
}
