import { Injectable, Logger } from "@nestjs/common";
import { createPublicKey, createVerify, timingSafeEqual } from "crypto";

/**
 * Google's public X.509 certificates for Firebase ID tokens (secure token service).
 * Documented at https://firebase.google.com/docs/auth/admin/verify-id-tokens
 */
const FIREBASE_CERT_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

/** Clock skew tolerance, in seconds, for exp/iat checks. */
const CLOCK_SKEW_SECONDS = 60;

/** Fallback cache lifetime if Google omits a usable Cache-Control max-age. */
const DEFAULT_CERT_TTL_MS = 60 * 60 * 1000;

export interface FirebaseTokenClaims {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
  /** Custom claims minted by your backend via the Admin SDK, e.g. { role: "ADMIN" }. */
  raw: Record<string, unknown>;
}

export class FirebaseTokenError extends Error {}

/**
 * Verifies Firebase ID tokens by checking the RS256 signature against Google's
 * published certificates, then validating the standard claims.
 *
 * Implemented with node:crypto rather than firebase-admin so the API needs no
 * service-account credentials — only the public project id.
 */
@Injectable()
export class FirebaseTokenVerifier {
  private readonly logger = new Logger(FirebaseTokenVerifier.name);

  private certCache: Record<string, string> = {};
  private certCacheExpiresAt = 0;
  private inFlightFetch: Promise<Record<string, string>> | null = null;

  private get projectId(): string | undefined {
    return (
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    );
  }

  async verify(idToken: string): Promise<FirebaseTokenClaims> {
    const projectId = this.projectId;
    if (!projectId) {
      // Fail closed. Accepting tokens without knowing the expected audience
      // would let a token minted for any other Firebase project through.
      throw new FirebaseTokenError(
        "FIREBASE_PROJECT_ID is not configured on the server",
      );
    }

    const segments = idToken.split(".");
    if (segments.length !== 3) {
      throw new FirebaseTokenError("Malformed ID token");
    }

    const [encodedHeader, encodedPayload, encodedSignature] = segments;

    const header = this.decodeJson(encodedHeader, "header");
    const payload = this.decodeJson(encodedPayload, "payload");

    if (header.alg !== "RS256") {
      throw new FirebaseTokenError(
        `Unexpected token algorithm: ${String(header.alg)}`,
      );
    }
    const kid = typeof header.kid === "string" ? header.kid : null;
    if (!kid) {
      throw new FirebaseTokenError("ID token is missing a key id (kid)");
    }

    const certificate = await this.resolveCertificate(kid);
    if (!certificate) {
      throw new FirebaseTokenError(`No public key matches key id ${kid}`);
    }

    const publicKey = createPublicKey(certificate);
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${encodedHeader}.${encodedPayload}`);
    verifier.end();

    const signature = Buffer.from(encodedSignature, "base64url");
    if (!verifier.verify(publicKey, signature)) {
      throw new FirebaseTokenError("ID token signature verification failed");
    }

    this.assertClaims(payload, projectId);

    const uid = String(payload.sub);
    return {
      uid,
      email: typeof payload.email === "string" ? payload.email : undefined,
      emailVerified: payload.email_verified === true,
      name:
        typeof payload.name === "string"
          ? payload.name
          : typeof payload.email === "string"
            ? payload.email.split("@")[0]
            : undefined,
      picture:
        typeof payload.picture === "string" ? payload.picture : undefined,
      raw: payload,
    };
  }

  private assertClaims(payload: Record<string, any>, projectId: string): void {
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (typeof payload.exp !== "number") {
      throw new FirebaseTokenError("ID token has no expiry");
    }
    if (payload.exp + CLOCK_SKEW_SECONDS < nowSeconds) {
      throw new FirebaseTokenError("ID token has expired");
    }

    if (
      typeof payload.iat === "number" &&
      payload.iat - CLOCK_SKEW_SECONDS > nowSeconds
    ) {
      throw new FirebaseTokenError("ID token was issued in the future");
    }

    // auth_time must be in the past — guards against replay of pre-minted tokens.
    if (
      typeof payload.auth_time === "number" &&
      payload.auth_time - CLOCK_SKEW_SECONDS > nowSeconds
    ) {
      throw new FirebaseTokenError("ID token auth_time is in the future");
    }

    if (!this.constantTimeEquals(String(payload.aud ?? ""), projectId)) {
      throw new FirebaseTokenError("ID token audience does not match project");
    }

    const expectedIssuer = `https://securetoken.google.com/${projectId}`;
    if (!this.constantTimeEquals(String(payload.iss ?? ""), expectedIssuer)) {
      throw new FirebaseTokenError("ID token issuer does not match project");
    }

    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw new FirebaseTokenError("ID token subject is empty");
    }
  }

  private constantTimeEquals(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  }

  private decodeJson(segment: string, label: string): Record<string, any> {
    try {
      const json = Buffer.from(segment, "base64url").toString("utf-8");
      const parsed = JSON.parse(json);
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("not an object");
      }
      return parsed;
    } catch {
      throw new FirebaseTokenError(`Unable to decode ID token ${label}`);
    }
  }

  private async resolveCertificate(kid: string): Promise<string | null> {
    if (Date.now() < this.certCacheExpiresAt && this.certCache[kid]) {
      return this.certCache[kid];
    }

    const certs = await this.fetchCertificates();
    return certs[kid] ?? null;
  }

  private fetchCertificates(): Promise<Record<string, string>> {
    // Collapse concurrent refreshes into a single upstream request.
    if (this.inFlightFetch) return this.inFlightFetch;

    this.inFlightFetch = (async () => {
      try {
        const response = await fetch(FIREBASE_CERT_URL, {
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
          throw new Error(`Google returned ${response.status}`);
        }

        const certs = (await response.json()) as Record<string, string>;
        this.certCache = certs;
        this.certCacheExpiresAt =
          Date.now() +
          this.parseMaxAgeMs(response.headers.get("cache-control"));

        return certs;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to refresh Firebase certificates: ${message}`,
        );

        // Serve the previous certificate set if we still have one — a transient
        // network blip should not log every user out.
        if (Object.keys(this.certCache).length > 0) return this.certCache;

        throw new FirebaseTokenError(
          "Unable to fetch Firebase signing certificates",
        );
      } finally {
        this.inFlightFetch = null;
      }
    })();

    return this.inFlightFetch;
  }

  private parseMaxAgeMs(cacheControl: string | null): number {
    const match = cacheControl?.match(/max-age=(\d+)/);
    if (!match) return DEFAULT_CERT_TTL_MS;

    const seconds = Number(match[1]);
    if (!Number.isFinite(seconds) || seconds <= 0) return DEFAULT_CERT_TTL_MS;

    return seconds * 1000;
  }
}
