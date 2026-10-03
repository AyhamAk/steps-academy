import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV ?? "development";

// Fail fast rather than silently issuing forgeable tokens in production.
// Names only, never values: if the host isn't injecting variables the way we
// expect, the message needs to say so instead of leaving us guessing.
if (nodeEnv === "production" && !process.env.JWT_SECRET) {
  const seen = Object.keys(process.env)
    .filter((k) => /^(NODE_ENV|PORT|JWT_|DATABASE_|DIRECT_|R2_|GOOGLE_|ADMIN_|CORS_|RAILWAY_)/.test(k))
    .sort();
  const where = [
    `service=${process.env.RAILWAY_SERVICE_NAME ?? "?"}`,
    `env=${process.env.RAILWAY_ENVIRONMENT_NAME ?? "?"}`,
    `branch=${process.env.RAILWAY_GIT_BRANCH ?? "?"}`,
    `commit=${(process.env.RAILWAY_GIT_COMMIT_SHA ?? "?").slice(0, 7)}`,
  ].join(" ");
  throw new Error(
    `JWT_SECRET must be set in production. Running as [${where}]. Config-related variables this process can see: ${
      seen.length ? seen.join(", ") : "(none at all)"
    }`
  );
}

export const env = {
  port: process.env.PORT ?? 4000,
  nodeEnv,
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-insecure-secret",
  // A year: every sign-in costs an SMS, and a parent should not be asked for a
  // new code every month.
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "365d",
  /** Twilio Verify, for sign-in codes (WhatsApp, falling back to SMS). */
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID ?? "",
  },
  /** One number app reviewers sign in with, using a fixed code and no SMS. */
  reviewPhone: process.env.REVIEW_PHONE ?? "",
  reviewCode: process.env.REVIEW_CODE ?? "",
  /**
   * A second fixed number, same code, that signs in as an existing admin
   * account (found by email) — for testing the manager side by phone.
   */
  reviewAdminPhone: process.env.REVIEW_ADMIN_PHONE ?? "",
  reviewAdminEmail: process.env.REVIEW_ADMIN_EMAIL ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  /**
   * Google sign-in is off until the Android OAuth client carries the Play App
   * Signing SHA-1, which only exists after the first bundle upload. Defaults
   * to off, so an unset variable is the safe state rather than the open one.
   */
  googleSignInEnabled: process.env.GOOGLE_SIGN_IN_ENABLED === "true",
  /**
   * A Google ID token's audience is whichever client ID requested it, so a
   * sign-in from iOS carries the iOS client ID — not the web one. Verifying
   * against a single ID fails for every platform except that one.
   */
  googleAudiences: [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
  ].filter((id): id is string => !!id),
  adminEmails: (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  corsOrigin: process.env.CORS_ORIGIN,
  // Shown on the public privacy and deletion pages, and the address families
  // are told to write to. Set ACADEMY_EMAIL in the environment.
  academyEmail: process.env.ACADEMY_EMAIL ?? "hello@stepsacademy.example",
  r2: {
    accountId: process.env.R2_ACCOUNT_ID ?? "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    bucketName: process.env.R2_BUCKET_NAME ?? "",
    endpoint: process.env.R2_ENDPOINT ?? "",
  },
};
