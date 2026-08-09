import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(config: ConfigService) {
    super({
      clientID: config.get("GOOGLE_CLIENT_ID") || "placeholder_client_id",
      clientSecret:
        config.get("GOOGLE_CLIENT_SECRET") || "placeholder_client_secret",
      callbackURL:
        config.get("GOOGLE_CALLBACK_URL") ||
        "http://localhost:3001/api/v1/auth/google/callback",
      scope: ["email", "profile"],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;
    const primaryEmail = emails?.[0];
    const user = {
      googleId: id,
      email: primaryEmail?.value,
      emailVerified:
        profile?._json?.email_verified === true ||
        profile?._json?.verified_email === true ||
        primaryEmail?.verified === true,
      firstName: name?.givenName,
      lastName: name?.familyName,
      picture: photos?.[0]?.value,
    };
    done(null, user);
  }
}
