import { validateEnv } from "./env.validation";

function secureProductionEnv() {
  return {
    NODE_ENV: "production",
    JWT_SECRET: "a".repeat(48),
    JWT_REFRESH_SECRET: "b".repeat(48),
    TOTP_ENCRYPTION_KEY: "c".repeat(48),
    ADMIN_METRICS_TOKEN: "d".repeat(48),
    REVALIDATE_SECRET: "e".repeat(48),
    FRONTEND_URL: "https://netphim.example",
    TURNSTILE_SECRET_KEY: "turnstile-secret",
    GITHUB_ADMIN_CLIENT_ID: "client-id",
    GITHUB_ADMIN_CLIENT_SECRET: "client-secret",
    ADMIN_GITHUB_CALLBACK_URL:
      "https://admin.netphim.example/api/auth/github/callback",
    ADMIN_GITHUB_ALLOWED_IDS: "12345678",
    ADMIN_GITHUB_ALLOWED_LOGINS: "netphim-owner",
    ADMIN_REQUIRE_2FA: "true",
    ADMIN_SESSION_BIND_IP: "true",
  };
}

describe("production admin environment validation", () => {
  it("accepts one GitHub owner with mandatory 2FA and IP binding", () => {
    const config = secureProductionEnv();
    expect(validateEnv(config)).toBe(config);
  });

  it("rejects production without GitHub OAuth", () => {
    const config = secureProductionEnv();
    delete (config as Partial<typeof config>).GITHUB_ADMIN_CLIENT_ID;
    expect(() => validateEnv(config)).toThrow(
      "GITHUB_ADMIN_CLIENT_ID is required",
    );
  });

  it("rejects more than one allowed GitHub ID", () => {
    const config = {
      ...secureProductionEnv(),
      ADMIN_GITHUB_ALLOWED_IDS: "12345678,87654321",
    };
    expect(() => validateEnv(config)).toThrow("exactly one GitHub ID");
  });

  it("does not allow disabling production 2FA or IP binding", () => {
    expect(() =>
      validateEnv({
        ...secureProductionEnv(),
        ADMIN_REQUIRE_2FA: "false",
        ADMIN_SESSION_BIND_IP: "false",
      }),
    ).toThrow("ADMIN_REQUIRE_2FA cannot be false");
  });
});
