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
  "secret",
  "changeme",
]);

const REQUIRED_SECRETS = ["JWT_SECRET", "JWT_REFRESH_SECRET", "TOTP_ENCRYPTION_KEY"] as const;

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
