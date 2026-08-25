import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";
import { FirebaseTokenVerifier } from "./firebase-token-verifier.service";
import { FirebaseAuthGuard } from "./guards/firebase-auth.guard";
import { TurnstileService } from "./turnstile.service";
import { GoogleOAuthGuard } from "./guards/google-oauth.guard";
import { GoogleLinkAuthGuard } from "./guards/google-link-auth.guard";
import { RedisCacheModule } from "../redis/redis.module";

@Module({
  imports: [
    RedisCacheModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get("JWT_SECRET"),
        signOptions: { expiresIn: config.get("JWT_EXPIRES_IN") || "15m" },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    FirebaseTokenVerifier,
    FirebaseAuthGuard,
    TurnstileService,
    GoogleOAuthGuard,
    GoogleLinkAuthGuard,
  ],
  exports: [AuthService, JwtModule, FirebaseTokenVerifier, FirebaseAuthGuard],
})
export class AuthModule {}
