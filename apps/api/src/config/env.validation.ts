import { Logger } from "@nestjs/common";

const logger = new Logger("EnvValidation");

/** Minimum acceptable length for a signing/encryption secret. */
const MIN_SECRET_LENGTH = 32;

/**
 * Placeholder values shipped in .env.example. Booting production with any of
 * these means every token the API issues is forgeable by anyone who has read
 * the repository.
 */
const KNOWN_PLACEHOLDER_SECRETS = new Set([
  "your-super-secret-jwt-key-change-in-production",
  "your-super-secret-refresh-key-change-in-production",
  "default_crypto_secret",
  "dummy_secret_for_ci",
  "replace-with-a-long-random-token",
  "replace-with-a-unique-random-secret",
  "replace-with-a-different-random-secret",
  "replace-with-another-random-secret",
  "replace-with-a-dedicated-random-secret",
  "replace-with-a-dedicated-random-token",
  "replace-with-a-dedicated-random-token-at-least-32-characters",
  "secret",
  "changeme",
]);

const REQUIRED_SECRETS = [
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "TOTP_ENCRYPTION_KEY",
  "ADMIN_METRICS_TOKEN",
  "REVALIDATE_SECRET",
  "HLS_PROXY_SECRET",
  "RECOMMENDATION_ADMIN_TOKEN",
] as const;

/**
 * Validates security-critical configuration at boot.
 *
 * Fails fast in production rather than silently running with a weak or default
 * secret; in development the same problems are logged as warnings so local work
 * isn't blocked.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const isProduction = config.NODE_ENV === "production";
  const problems: string[] = [];

  for (const key of REQUIRED_SECRETS) {
    const value = config[key];

    if (typeof value !== "string" || value.length === 0) {
      problems.push(`${key} is not set`);
      continue;
    }
    if (KNOWN_PLACEHOLDER_SECRETS.has(value)) {
      problems.push(`${key} still uses a known placeholder value`);
    }
    if (value.length < MIN_SECRET_LENGTH) {
      problems.push(
        `${key} is only ${value.length} characters (minimum ${MIN_SECRET_LENGTH})`,
      );
    }
  }

  // Reusing one secret for both access and refresh tokens means a leaked access
  // token secret also mints refresh tokens, defeating rotation entirely.
  if (
    typeof config.JWT_SECRET === "string" &&
    config.JWT_SECRET === config.JWT_REFRESH_SECRET
  ) {
    problems.push("JWT_SECRET and JWT_REFRESH_SECRET must be different values");
  }

  // TOTP key phải khác JWT_SECRET — mục đích là isolate encryption keys
  if (
    typeof config.JWT_SECRET === "string" &&
    typeof config.TOTP_ENCRYPTION_KEY === "string" &&
    config.JWT_SECRET === config.TOTP_ENCRYPTION_KEY
  ) {
    problems.push("TOTP_ENCRYPTION_KEY must be different from JWT_SECRET");
  }

  if (isProduction && !config.FRONTEND_URL) {
    problems.push(
      "FRONTEND_URL is not set — CORS would fall back to http://localhost:3000",
    );
  }

  if (isProduction && !config.TURNSTILE_SECRET_KEY) {
    problems.push(
      "TURNSTILE_SECRET_KEY is not set - credential authentication would be unprotected",
    );
  }

  const githubAdminKeys = [
    "GITHUB_ADMIN_CLIENT_ID",
    "GITHUB_ADMIN_CLIENT_SECRET",
    "ADMIN_GITHUB_CALLBACK_URL",
  ] as const;
  const githubAdminConfigured = githubAdminKeys.some(
    (key) => typeof config[key] === "string" && config[key].length > 0,
  );
  if (githubAdminConfigured || isProduction) {
    for (const key of githubAdminKeys) {
      if (typeof config[key] !== "string" || config[key].length === 0) {
        problems.push(`${key} is required when GitHub Admin OAuth is enabled`);
      }
    }
    try {
      const callback = new URL(String(config.ADMIN_GITHUB_CALLBACK_URL));
      if (isProduction && callback.protocol !== "https:") {
        problems.push("ADMIN_GITHUB_CALLBACK_URL must use HTTPS in production");
      }
    } catch {
      problems.push("ADMIN_GITHUB_CALLBACK_URL is not a valid absolute URL");
    }

    const allowedGithubIds =
      typeof config.ADMIN_GITHUB_ALLOWED_IDS === "string"
        ? config.ADMIN_GITHUB_ALLOWED_IDS.split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : [];
    if (!allowedGithubIds.length) {
      problems.push(
        "ADMIN_GITHUB_ALLOWED_IDS is required when GitHub Admin OAuth is enabled",
      );
    }
    if (allowedGithubIds.some((id) => !/^\d+$/.test(id))) {
      problems.push(
        "ADMIN_GITHUB_ALLOWED_IDS must contain comma-separated numeric GitHub IDs",
      );
    }
    if (isProduction && allowedGithubIds.length !== 1) {
      problems.push(
        "ADMIN_GITHUB_ALLOWED_IDS must contain exactly one GitHub ID in production",
      );
    }

    const allowedGithubLogins =
      typeof config.ADMIN_GITHUB_ALLOWED_LOGINS === "string"
        ? config.ADMIN_GITHUB_ALLOWED_LOGINS.split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : [];
    if (isProduction && allowedGithubLogins.length > 1) {
      problems.push(
        "ADMIN_GITHUB_ALLOWED_LOGINS may contain at most one login in production",
      );
    }
  }

  if (isProduction && config.ADMIN_REQUIRE_2FA === "false") {
    problems.push("ADMIN_REQUIRE_2FA cannot be false in production");
  }
  if (isProduction && config.ADMIN_SESSION_BIND_IP === "false") {
    problems.push("ADMIN_SESSION_BIND_IP cannot be false in production");
  }

  if (problems.length > 0) {
    const summary = problems.map((p) => `  - ${p}`).join("\n");

    if (isProduction) {
      throw new Error(
        `Refusing to start: insecure configuration detected.\n${summary}\n` +
          `Generate strong secrets with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`,
      );
    }

    logger.warn(
      `Insecure configuration detected (allowed outside production):\n${summary}`,
    );
  }

  return config;
}
